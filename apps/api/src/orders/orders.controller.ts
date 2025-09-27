import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

/**
 * OrdersController handles HTTP requests for order management.
 *
 * This controller is responsible for:
 * - Validating incoming order requests
 * - Delegating order creation to OrdersService
 * - Returning appropriate HTTP responses
 *
 * All order validation is handled by CreateOrderDto using class-validator decorators.
 */
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Creates a new trading order.
   *
   * @param createOrderDto - Validated order data from request body
   * @returns Promise with order submission confirmation
   *
   * @example
   * POST /orders
   * {
   *   "tradingPair": "BTC-USD",
   *   "type": "BUY",
   *   "price": 50000,
   *   "quantity": 0.1,
   *   "userId": 1
   * }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<{ message: string; orderId: string }> {
    this.logger.log(
      `Received order creation request for ${createOrderDto.tradingPair}`,
    );

    try {
      const result = await this.ordersService.createOrder(createOrderDto);
      this.logger.log(`Order ${result.orderId} created successfully`);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to create order: ${errorMessage}`, errorStack);
      throw error; // Let global exception filter handle the response
    }
  }
}
