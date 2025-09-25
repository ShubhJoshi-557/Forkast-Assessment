import { OrderType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUppercase,
} from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  @IsUppercase()
  tradingPair: string; // e.g., "BTC-USD"

  @IsNotEmpty()
  @IsEnum(OrderType)
  type: OrderType;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;
}
