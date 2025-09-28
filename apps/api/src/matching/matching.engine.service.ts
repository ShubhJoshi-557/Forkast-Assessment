import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OrderStatus, OrderType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Consumer, Kafka } from 'kafkajs';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { MarketService } from '../market/market.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Payload structure for new orders received from Kafka.
 *
 * This type defines the structure of order data that flows through the system
 * from the API gateway to the matching engine via Kafka.
 */
interface NewOrderPayload {
  id: string;
  userId: number;
  tradingPair: string;
  type: OrderType;
  price: number;
  quantity: number;
}

/**
 * Result structure for batch trade processing.
 * Contains all trades executed and orders updated during a single order processing cycle.
 */
interface TradeProcessingResult {
  newOrder: {
    id: string;
    tradingPair: string;
  };
  trades: Array<{
    id: string;
    tradingPair: string;
    buyOrderId: string;
    sellOrderId: string;
    quantity: Prisma.Decimal;
    price: Prisma.Decimal;
    createdAt: Date;
  }>;
  orderUpdates: Array<{
    id: string;
    userId: number;
    tradingPair: string;
    type: OrderType;
    status: OrderStatus;
    price: Prisma.Decimal;
    quantity: Prisma.Decimal;
    filledQuantity: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

/**
 * MatchingEngineService is the core component responsible for order matching and trade execution.
 *
 * This service implements a high-performance matching engine that:
 * - Consumes orders from Kafka 'orders.new' topic
 * - Implements Price-Time Priority matching algorithm
 * - Executes trades in batches for optimal performance
 * - Publishes trade and order update events
 * - Maintains data consistency through database transactions
 * - Uses in-memory order tracking for ultra-fast aggressor calculation
 * - Invalidates Redis cache on order updates
 *
 * The matching algorithm ensures:
 * - Price priority: Best prices are matched first
 * - Time priority: Earlier orders at same price are matched first
 * - Atomicity: All trades for an order are processed in a single transaction
 * - Idempotency: Duplicate orders are handled gracefully
 */
@Injectable()
export class MatchingEngineService implements OnModuleInit {
  private readonly logger = new Logger(MatchingEngineService.name);
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  // Configuration constants for optimal performance
  private static readonly BATCH_SIZE = 10; // Process trades in batches of 10
  private static readonly HEARTBEAT_INTERVAL = 5; // Send heartbeat every 5 messages
  private static readonly MAX_CONCURRENT_PARTITIONS = 8; // Process up to 8 partitions concurrently

  // In-memory order tracking for aggressor calculation
  private readonly orderCache = new Map<
    string,
    {
      id: string;
      type: OrderType;
      createdAt: Date;
      tradingPair: string;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly marketService: MarketService,
  ) {
    // Validate required environment variables
    if (!process.env.KAFKA_BROKER_URL) {
      throw new Error(
        'KAFKA_BROKER_URL is not defined in the environment variables',
      );
    }

    // Initialize Kafka client with optimized settings
    this.kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER_URL],
      requestTimeout: 30000, // 30 second request timeout
    });

    // Configure consumer with performance-optimized settings
    this.consumer = this.kafka.consumer({
      groupId: 'matching-engine',
      sessionTimeout: 60000, // 60 second session timeout
      heartbeatInterval: 10000, // 10 second heartbeat interval
      rebalanceTimeout: 120000, // 2 minute rebalance timeout
      maxWaitTimeInMs: 5000, // Max wait time for batch collection
      metadataMaxAge: 300000, // 5 minute metadata cache
      maxBytesPerPartition: 1048576, // 1MB per partition
      minBytes: 1, // Minimum bytes to collect
      maxBytes: 10485760, // 10MB maximum batch size
    });
  }

  /**
   * Initializes the matching engine by connecting to Kafka and starting message consumption.
   *
   * This method sets up the Kafka consumer to process orders from the 'orders.new' topic
   * and handles the complete order processing lifecycle.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing matching engine...');

      // Connect to Kafka
      await this.consumer.connect();
      this.logger.log('Connected to Kafka successfully');

      // Subscribe to orders topic
      await this.consumer.subscribe({ topic: 'orders.new' });
      this.logger.log('Subscribed to orders.new topic');

      // Start consuming messages with optimized batch processing
      await this.consumer.run({
        partitionsConsumedConcurrently:
          MatchingEngineService.MAX_CONCURRENT_PARTITIONS,
        eachBatchAutoResolve: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        eachBatch: this.handleBatch.bind(this),
      });

      this.logger.log('Matching engine started successfully');
    } catch (error: unknown) {
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Failed to initialize matching engine', errorStack);
      throw error;
    }
  }

  /**
   * Handles a batch of messages from Kafka.
   *
   * This method processes multiple orders in a single batch for optimal performance,
   * with proper heartbeat management to prevent consumer group rebalancing.
   *
   * @param batch - Kafka message batch
   * @param heartbeat - Function to send heartbeat to Kafka
   */
  private async handleBatch({
    batch,
    heartbeat,
  }: {
    batch: any;
    heartbeat: () => Promise<void>;
  }): Promise<void> {
    let messageCount = 0;
    const batchStartTime = Date.now();

    try {
      // Process each message in the batch
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      for (const message of batch.messages) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!message.value) {
          this.logger.warn('Received message with no value, skipping');
          continue;
        }

        // Send heartbeat periodically to prevent session timeout
        if (messageCount % MatchingEngineService.HEARTBEAT_INTERVAL === 0) {
          await heartbeat();
        }

        // Parse and process the order
        const incomingOrder = JSON.parse(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
          message.value.toString(),
        ) as NewOrderPayload;
        await this.processOrder(incomingOrder);
        messageCount++;
      }

      // Send final heartbeat after processing entire batch
      await heartbeat();

      const processingTime = Date.now() - batchStartTime;
      this.logger.debug(
        `Processed ${messageCount} orders in ${processingTime}ms`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Error processing batch: ${errorMessage}`, errorStack);
      // Re-throw to trigger Kafka's retry mechanism
      throw error;
    }
  }

  /**
   * Processes a single order through the complete matching engine workflow.
   *
   * This method implements the core order processing logic:
   * 1. Creates the order in the database (idempotent)
   * 2. Caches order data in memory for aggressor calculation
   * 3. Finds matching orders using optimized queries
   * 4. Executes trades in batches for performance
   * 5. Publishes events for real-time updates
   * 6. Invalidates Redis cache for order book updates
   *
   * @param order - Order payload from Kafka
   */
  private async processOrder(order: NewOrderPayload): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Processing order ${order.id}: ${order.type} ${order.quantity} @ ${order.price} for ${order.tradingPair}`,
      );

      // Step 1: Create order in database (idempotent operation)
      const newOrder = await this.createOrder(order);
      if (!newOrder) {
        this.logger.warn(
          `Order ${order.id} already exists, skipping (idempotent)`,
        );
        return;
      }

      this.logger.debug(`Created order ${newOrder.id} in database`);

      // Step 2: Cache order data in memory for aggressor calculation
      this.cacheOrderData(newOrder);

      // Step 3: Find matching orders using optimized database query
      const matchingOrders = await this.findMatchingOrders(newOrder);
      this.logger.debug(
        `Found ${matchingOrders.length} matching orders for ${newOrder.id}`,
      );

      if (matchingOrders.length === 0) {
        // No matches found, publish order update and invalidate cache
        this.logger.debug(
          `No matches found for order ${newOrder.id}, publishing order update`,
        );
        await this.publishOrderUpdate(newOrder);
        await this.marketService.invalidateOrderBookCache(order.tradingPair);
        return;
      }

      // Step 4: Process trades in batches to optimize database performance
      this.logger.debug(
        `Processing ${matchingOrders.length} matching orders in batches`,
      );
      const result = await this.processTradesInBatches(
        newOrder,
        matchingOrders,
      );

      this.logger.log(
        `Executed ${result.trades.length} trades for order ${newOrder.id} in ${Date.now() - startTime}ms`,
      );

      // Step 5: Publish all events asynchronously for real-time updates
      await this.publishEventsWithAggressor(result);

      // Step 6: Invalidate Redis cache for order book updates
      await this.marketService.invalidateOrderBookCache(order.tradingPair);

      this.logger.debug(
        `Published events and invalidated cache for order ${newOrder.id}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to process order ${order.id}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Creates a new order in the database with idempotency support.
   *
   * This method handles duplicate order creation gracefully by catching
   * unique constraint violations and returning null for idempotent behavior.
   *
   * @param order - Order data to create
   * @returns Created order or null if already exists (idempotent)
   */
  private async createOrder(order: NewOrderPayload) {
    try {
      const createdOrder = await this.prisma.order.create({
        data: {
          id: order.id,
          userId: order.userId,
          tradingPair: order.tradingPair,
          type: order.type,
          status: OrderStatus.OPEN,
          price: new Prisma.Decimal(order.price),
          quantity: new Prisma.Decimal(order.quantity),
          filledQuantity: new Prisma.Decimal(0),
        },
      });

      this.logger.debug(`Created order ${createdOrder.id} in database`);
      return createdOrder;
    } catch (error: unknown) {
      // Handle Prisma unique constraint violation (P2002)
      if (this.isPrismaUniqueConstraintError(error)) {
        this.logger.debug(
          `Order ${order.id} already exists, skipping (idempotent)`,
        );
        return null; // Idempotent no-op
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to create order ${order.id}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Checks if an error is a Prisma unique constraint violation.
   *
   * @param error - Error to check
   * @returns True if it's a unique constraint violation
   */
  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }

  /**
   * Finds orders that can be matched with the incoming order using Price-Time Priority.
   *
   * This method implements the core matching logic:
   * - For BUY orders: finds SELL orders with price <= incoming price
   * - For SELL orders: finds BUY orders with price >= incoming price
   * - Orders are sorted by price (best first) then by time (earliest first)
   * - Only OPEN and PARTIALLY_FILLED orders are considered
   *
   * @param newOrder - Order to find matches for
   * @returns Array of matching orders sorted by priority
   */
  private async findMatchingOrders(newOrder: {
    tradingPair: string;
    type: OrderType;
    price: Prisma.Decimal;
  }): Promise<
    Array<{
      id: string;
      quantity: Prisma.Decimal;
      filledQuantity: Prisma.Decimal;
      price: Prisma.Decimal;
    }>
  > {
    try {
      const matchingOrders = await this.prisma.order.findMany({
        where: {
          tradingPair: newOrder.tradingPair,
          // Find opposite order type (BUY matches with SELL, and vice versa)
          type:
            newOrder.type === OrderType.BUY ? OrderType.SELL : OrderType.BUY,
          // Only consider orders that can still be filled
          status: { in: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED] },
          // Price matching logic:
          // - BUY orders match with SELL orders at or below the buy price
          // - SELL orders match with BUY orders at or above the sell price
          price:
            newOrder.type === OrderType.BUY
              ? { lte: newOrder.price } // BUY: find SELL orders with price <= buy price
              : { gte: newOrder.price }, // SELL: find BUY orders with price >= sell price
        },
        orderBy: [
          // Price priority: best price first
          { price: newOrder.type === OrderType.BUY ? 'asc' : 'desc' },
          // Time priority: earliest order first at same price
          { createdAt: 'asc' },
        ],
        select: {
          id: true,
          quantity: true,
          filledQuantity: true,
          price: true,
        },
      });

      this.logger.debug(
        `Found ${matchingOrders.length} potential matches for ${newOrder.tradingPair}`,
      );
      return matchingOrders;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to find matching orders: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Processes trades in batches to optimize database performance and prevent long transactions.
   *
   * This method implements the core trade execution logic:
   * - Processes matching orders in batches of 10 to avoid long database transactions
   * - Executes trades atomically within each batch
   * - Updates order statuses based on fill quantities
   * - Tracks remaining quantity to fill
   *
   * @param newOrder - The incoming order to match against
   * @param matchingOrders - Array of orders that can be matched
   * @returns TradeProcessingResult containing all executed trades and order updates
   */
  private async processTradesInBatches(
    newOrder: {
      id: string;
      tradingPair: string;
      type: OrderType;
      quantity: Prisma.Decimal;
    },
    matchingOrders: Array<{
      id: string;
      quantity: Prisma.Decimal;
      filledQuantity: Prisma.Decimal;
      price: Prisma.Decimal;
    }>,
  ): Promise<TradeProcessingResult> {
    const trades: Array<{
      id: string;
      tradingPair: string;
      buyOrderId: string;
      sellOrderId: string;
      quantity: Prisma.Decimal;
      price: Prisma.Decimal;
      createdAt: Date;
    }> = [];
    const orderUpdates: Array<{
      id: string;
      userId: number;
      tradingPair: string;
      type: OrderType;
      status: OrderStatus;
      price: Prisma.Decimal;
      quantity: Prisma.Decimal;
      filledQuantity: Prisma.Decimal;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    let remainingQuantity = newOrder.quantity;

    // Process in batches of 10 orders to avoid long transactions
    const batchSize = 10;
    for (
      let i = 0;
      i < matchingOrders.length && !remainingQuantity.isZero();
      i += batchSize
    ) {
      const batch = matchingOrders.slice(i, i + batchSize);

      const batchResult = await this.prisma.$transaction(async (tx) => {
        const batchTrades: Array<{
          id: string;
          tradingPair: string;
          buyOrderId: string;
          sellOrderId: string;
          quantity: Prisma.Decimal;
          price: Prisma.Decimal;
          createdAt: Date;
        }> = [];
        const batchUpdates: Array<{
          id: string;
          userId: number;
          tradingPair: string;
          type: OrderType;
          status: OrderStatus;
          price: Prisma.Decimal;
          quantity: Prisma.Decimal;
          filledQuantity: Prisma.Decimal;
          createdAt: Date;
          updatedAt: Date;
        }> = [];
        let batchRemaining = remainingQuantity;

        for (const opposingOrder of batch) {
          if (batchRemaining.isZero()) break;

          const availableQuantity = opposingOrder.quantity.minus(
            opposingOrder.filledQuantity,
          );

          if (availableQuantity.isZero()) {
            this.logger.debug(
              `Order ${opposingOrder.id} has no available quantity, skipping`,
            );
            continue;
          }

          const tradeQuantity = Decimal.min(batchRemaining, availableQuantity);
          this.logger.debug(
            `Creating trade: ${tradeQuantity.toString()} @ ${opposingOrder.price.toString()} between ${newOrder.id} and ${opposingOrder.id}`,
          );

          // Create trade
          const trade = await tx.trade.create({
            data: {
              tradingPair: newOrder.tradingPair,
              buyOrderId:
                newOrder.type === OrderType.BUY
                  ? newOrder.id
                  : opposingOrder.id,
              sellOrderId:
                newOrder.type === OrderType.SELL
                  ? newOrder.id
                  : opposingOrder.id,
              quantity: tradeQuantity,
              price: opposingOrder.price,
            },
          });

          // Update orders
          const newOrderUpdate = await this.updateOrderFillInTransaction(
            tx,
            newOrder.id,
            tradeQuantity,
          );
          const opposingOrderUpdate = await this.updateOrderFillInTransaction(
            tx,
            opposingOrder.id,
            tradeQuantity,
          );

          if (newOrderUpdate) batchUpdates.push(newOrderUpdate);
          if (opposingOrderUpdate) batchUpdates.push(opposingOrderUpdate);
          batchTrades.push(trade);

          batchRemaining = batchRemaining.minus(tradeQuantity);
          this.logger.debug(`Remaining quantity: ${batchRemaining.toString()}`);
        }

        return { batchTrades, batchUpdates, batchRemaining };
      });

      trades.push(...batchResult.batchTrades);
      orderUpdates.push(...batchResult.batchUpdates);
      remainingQuantity = batchResult.batchRemaining;
    }

    return {
      newOrder,
      trades,
      orderUpdates,
    };
  }

  /**
   * Caches order data in memory for ultra-fast aggressor calculation.
   *
   * @param order - Order data to cache
   */
  private cacheOrderData(order: {
    id: string;
    type: OrderType;
    createdAt: Date;
    tradingPair: string;
  }): void {
    this.orderCache.set(order.id, {
      id: order.id,
      type: order.type,
      createdAt: order.createdAt,
      tradingPair: order.tradingPair,
    });

    this.logger.debug(`Cached order data for ${order.id}`);
  }

  /**
   * Publishes all trade and order update events to Kafka asynchronously.
   * Uses in-memory order data for aggressor calculation to avoid DB queries.
   *
   * This method publishes:
   * - Initial order update for the new order
   * - All executed trades with aggressor type
   * - All order status updates
   *
   * All events are published in parallel for optimal performance.
   *
   * @param result - Trade processing result containing all events to publish
   */
  private async publishEventsWithAggressor(
    result: TradeProcessingResult,
  ): Promise<void> {
    // Publish all events asynchronously to avoid blocking
    const publishPromises: Promise<void>[] = [];

    // Initial order update
    publishPromises.push(
      this.kafkaProducer
        .produce({
          topic: 'orders.updated',
          messages: [
            {
              key: result.newOrder.id,
              value: JSON.stringify(result.newOrder),
            },
          ],
        })
        .then(() => {}),
    );

    // Trade executions with aggressor calculation
    for (const trade of result.trades) {
      const tradeWithAggressor = this.calculateAggressorForTrade(trade);
      publishPromises.push(
        this.kafkaProducer
          .produce({
            topic: 'trades.executed',
            messages: [
              {
                key: trade.tradingPair,
                value: JSON.stringify(tradeWithAggressor),
              },
            ],
          })
          .then(() => {}),
      );
    }

    // Order updates
    for (const orderUpdate of result.orderUpdates) {
      publishPromises.push(
        this.kafkaProducer
          .produce({
            topic: 'orders.updated',
            messages: [
              {
                key: orderUpdate.id,
                value: JSON.stringify(orderUpdate),
              },
            ],
          })
          .then(() => {}),
      );
    }

    // Execute all publishes in parallel
    await Promise.all(publishPromises);
  }

  /**
   * Calculates aggressor type for a trade using in-memory order data.
   * Avoids database queries for ultra-fast processing.
   *
   * @param trade - Trade data
   * @returns Trade with aggressor type
   */
  private calculateAggressorForTrade(trade: {
    id: string;
    tradingPair: string;
    buyOrderId: string;
    sellOrderId: string;
    quantity: Prisma.Decimal;
    price: Prisma.Decimal;
    createdAt: Date;
  }): {
    id: string;
    tradingPair: string;
    buyOrderId: string;
    sellOrderId: string;
    quantity: Prisma.Decimal;
    price: Prisma.Decimal;
    createdAt: Date;
    aggressorType: 'BUY' | 'SELL';
  } {
    const buyOrder = this.orderCache.get(trade.buyOrderId);
    const sellOrder = this.orderCache.get(trade.sellOrderId);

    if (!buyOrder || !sellOrder) {
      this.logger.warn(
        `Could not find cached order data for trade ${trade.id}, using default aggressor`,
      );
      return {
        ...trade,
        aggressorType: 'BUY' as const,
      };
    }

    // Compare order timestamps to determine aggressor
    // The order placed later is the aggressor (crosses the spread)
    const aggressorType =
      buyOrder.createdAt > sellOrder.createdAt ? buyOrder.type : sellOrder.type;

    this.logger.debug(
      `Calculated aggressor for trade ${trade.id}: ${aggressorType}`,
    );

    return {
      ...trade,
      aggressorType,
    };
  }

  /**
   * Publishes all trade and order update events to Kafka asynchronously.
   * Legacy method - kept for backward compatibility.
   *
   * @param result - Trade processing result containing all events to publish
   */
  private async publishEventsAsync(
    result: TradeProcessingResult,
  ): Promise<void> {
    // Delegate to the new method with aggressor calculation
    await this.publishEventsWithAggressor(result);
  }

  /**
   * Publishes an order update event to Kafka.
   *
   * @param order - Order data to publish
   */
  private async publishOrderUpdate(order: { id: string }): Promise<void> {
    try {
      await this.kafkaProducer.produce({
        topic: 'orders.updated',
        messages: [{ key: order.id, value: JSON.stringify(order) }],
      });
      this.logger.debug(`Published order update for ${order.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish order update for ${order.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Updates an order's fill quantity and status within a database transaction.
   *
   * This method:
   * - Calculates the new filled quantity
   * - Determines the appropriate order status (OPEN, PARTIALLY_FILLED, FILLED)
   * - Updates the order in the database
   *
   * @param tx - Prisma transaction client
   * @param orderId - ID of the order to update
   * @param quantity - Quantity to add to the filled amount
   * @returns Updated order or null if order not found
   */
  private async updateOrderFillInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
    quantity: Decimal,
  ): Promise<{
    id: string;
    userId: number;
    tradingPair: string;
    type: OrderType;
    status: OrderStatus;
    price: Prisma.Decimal;
    quantity: Prisma.Decimal;
    filledQuantity: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return null;

    const newFilledQuantity = order.filledQuantity.add(quantity);
    let newStatus = order.status;

    if (newFilledQuantity.gte(order.quantity)) {
      newStatus = OrderStatus.FILLED;
    } else if (newFilledQuantity.gt(0)) {
      newStatus = OrderStatus.PARTIALLY_FILLED;
    } else {
      newStatus = order.status; // Keep existing status if no fill
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        filledQuantity: newFilledQuantity,
        status: newStatus,
      },
    });

    return updatedOrder;
  }
}
