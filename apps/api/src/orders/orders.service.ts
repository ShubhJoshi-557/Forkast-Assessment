import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { CreateOrderDto } from './dto/create-order.dto';

/**
 * OrdersService handles order creation and submission to the matching engine.
 *
 * This service follows the CQRS pattern where:
 * - Commands (order creation) are handled here
 * - Queries (order status, order book) are handled by MarketService
 *
 * Orders are immediately published to Kafka for processing by the matching engine,
 * ensuring high throughput and decoupling from the matching logic.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  /**
   * Creates a new order and submits it to the matching engine via Kafka.
   *
   * @param data - Order creation data validated by CreateOrderDto
   * @returns Promise with order submission confirmation and order ID
   *
   * @throws Error if Kafka producer fails or order data is invalid
   */
  async createOrder(
    data: CreateOrderDto,
  ): Promise<{ message: string; orderId: string }> {
    try {
      // Generate unique order ID for idempotency
      const orderId = uuidv4();

      this.logger.log(
        `Creating order ${orderId} for ${data.tradingPair}: ${data.type} ${data.quantity} @ ${data.price}`,
      );

      // Prepare order payload for Kafka
      const orderPayload = {
        id: orderId,
        ...data, // Includes tradingPair, type, price, quantity, userId
      };

      // Publish to Kafka with trading pair as partition key for ordering
      await this.kafkaProducer.produce({
        topic: 'orders.new',
        messages: [
          {
            key: data.tradingPair, // Ensures orders for same pair are processed in order
            value: JSON.stringify(orderPayload),
          },
        ],
      });

      this.logger.log(
        `Order ${orderId} successfully submitted to matching engine`,
      );

      return {
        message: 'Order submitted successfully',
        orderId,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to create order: ${errorMessage}`, errorStack);
      throw new Error(`Failed to submit order: ${errorMessage}`);
    }
  }
}
