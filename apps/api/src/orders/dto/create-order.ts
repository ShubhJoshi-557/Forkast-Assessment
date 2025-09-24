import { OrderType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsEnum(OrderType)
  type: OrderType; // 'BUY' or 'SELL'

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  // In a real system, you'd get this from an auth guard (e.g., JWT)
  @IsNotEmpty()
  @IsNumber()
  userId: number;
}
