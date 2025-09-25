/*
  Warnings:

  - Added the required column `tradingPair` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tradingPair` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "tradingPair" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Trade" ADD COLUMN     "tradingPair" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Order_tradingPair_idx" ON "public"."Order"("tradingPair");

-- CreateIndex
CREATE INDEX "Trade_tradingPair_idx" ON "public"."Trade"("tradingPair");
