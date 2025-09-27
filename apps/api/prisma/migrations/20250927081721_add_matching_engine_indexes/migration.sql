-- CreateIndex
CREATE INDEX "Order_tradingPair_type_status_price_idx" ON "public"."Order"("tradingPair", "type", "status", "price");

-- CreateIndex
CREATE INDEX "Order_tradingPair_status_createdAt_idx" ON "public"."Order"("tradingPair", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_type_status_price_createdAt_idx" ON "public"."Order"("type", "status", "price", "createdAt");
