import { OrderType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUppercase,
  Max,
  Min,
} from 'class-validator';

/**
 * Data Transfer Object for creating new trading orders.
 *
 * This DTO validates all incoming order data and ensures:
 * - Trading pair is in correct format (e.g., "BTC-USD")
 * - Order type is valid (BUY or SELL)
 * - Price and quantity are positive numbers
 * - User ID is provided
 *
 * All validation errors are automatically handled by NestJS validation pipe.
 */
export class CreateOrderDto {
  /**
   * Trading pair identifier in format "BASE-QUOTE" (e.g., "BTC-USD", "ETH-USD")
   * Must be uppercase and follow the pattern: [A-Z]{3,4}-[A-Z]{3,4}
   */
  @IsNotEmpty({ message: 'Trading pair is required' })
  @IsString({ message: 'Trading pair must be a string' })
  @IsUppercase({ message: 'Trading pair must be uppercase' })
  tradingPair: string;

  /**
   * Order type - either BUY (market buy order) or SELL (market sell order)
   */
  @IsNotEmpty({ message: 'Order type is required' })
  @IsEnum(OrderType, { message: 'Order type must be either BUY or SELL' })
  type: OrderType;

  /**
   * Order price in quote currency (e.g., USD for BTC-USD)
   * Must be a positive number with up to 8 decimal places
   */
  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber(
    { maxDecimalPlaces: 8 },
    { message: 'Price must be a number with max 8 decimal places' },
  )
  @IsPositive({ message: 'Price must be positive' })
  @Min(0.00000001, { message: 'Price must be at least 0.00000001' })
  @Max(999999999, { message: 'Price cannot exceed 999,999,999' })
  price: number;

  /**
   * Order quantity in base currency (e.g., BTC for BTC-USD)
   * Must be a positive number with up to 8 decimal places
   */
  @IsNotEmpty({ message: 'Quantity is required' })
  @IsNumber(
    { maxDecimalPlaces: 8 },
    { message: 'Quantity must be a number with max 8 decimal places' },
  )
  @IsPositive({ message: 'Quantity must be positive' })
  @Min(0.00000001, { message: 'Quantity must be at least 0.00000001' })
  @Max(999999999, { message: 'Quantity cannot exceed 999,999,999' })
  quantity: number;

  /**
   * User ID who is placing the order
   * Must be a positive integer
   */
  @IsNotEmpty({ message: 'User ID is required' })
  @IsNumber({}, { message: 'User ID must be a number' })
  @Min(1, { message: 'User ID must be at least 1' })
  userId: number;
}
