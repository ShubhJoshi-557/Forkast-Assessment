# Manual Test Cases for Trade History Coloring Logic

## How to Test:

1. **Start the API server**: `cd apps/api && pnpm start:dev`
2. **Start the web app**: `cd apps/web && pnpm dev`
3. **Open the web app** in your browser
4. **Use the Place Order form** to place these orders
5. **Check the Trade History** to verify colors

---

## Test Case 1: BUY Taker (Should be GREEN + ↑)

**Scenario**: BUY order crosses spread against existing SELL order

**Orders to Place**:

1. **SELL** 1 XRP @ $100 (Maker order - sits on order book)
2. **BUY** 1 XRP @ $101 (Taker order - crosses spread)

**Expected Result**:

- Trade appears in green with up arrow ↑
- Reason: BUY order was the taker (crossed the spread)

---

## Test Case 2: SELL Taker (Should be RED + ↓)

**Scenario**: SELL order crosses spread against existing BUY order

**Orders to Place**:

1. **BUY** 1 XRP @ $101 (Maker order - sits on order book)
2. **SELL** 1 XRP @ $100 (Taker order - crosses spread)

**Expected Result**:

- Trade appears in red with down arrow ↓
- Reason: SELL order was the taker (crossed the spread)

---

## Test Case 3: Multiple BUY Takers (All GREEN + ↑)

**Scenario**: Multiple BUY orders cross spread

**Orders to Place**:

1. **SELL** 5 XRP @ $100 (Maker order)
2. **BUY** 1 XRP @ $101 (Taker 1)
3. **BUY** 2 XRP @ $102 (Taker 2)
4. **BUY** 1 XRP @ $103 (Taker 3)

**Expected Result**:

- All 3 trades appear in green with up arrow ↑
- Reason: All BUY orders were takers

---

## Test Case 4: Multiple SELL Takers (All RED + ↓)

**Scenario**: Multiple SELL orders cross spread

**Orders to Place**:

1. **BUY** 5 XRP @ $103 (Maker order)
2. **SELL** 1 XRP @ $102 (Taker 1)
3. **SELL** 2 XRP @ $101 (Taker 2)
4. **SELL** 1 XRP @ $100 (Taker 3)

**Expected Result**:

- All 3 trades appear in red with down arrow ↓
- Reason: All SELL orders were takers

---

## Test Case 5: Mixed Takers (GREEN and RED)

**Scenario**: Both BUY and SELL orders cross spread

**Orders to Place**:

1. **SELL** 2 XRP @ $100 (Maker 1)
2. **BUY** 1 XRP @ $101 (Taker 1 - GREEN)
3. **BUY** 3 XRP @ $102 (Maker 2)
4. **SELL** 1 XRP @ $101 (Taker 2 - RED)
5. **SELL** 2 XRP @ $100 (Maker 3)
6. **BUY** 1 XRP @ $101 (Taker 3 - GREEN)

**Expected Result**:

- 3 trades total
- 2 GREEN trades (BUY takers)
- 1 RED trade (SELL taker)

---

## Test Case 6: Exact Price Match (Edge Case)

**Scenario**: Orders at exact same price

**Orders to Place**:

1. **SELL** 1 XRP @ $100.00 (Maker order)
2. **BUY** 1 XRP @ $100.00 (Taker order - same price)

**Expected Result**:

- Trade appears in green with up arrow ↑
- Reason: BUY order was placed later (taker)

---

## Test Case 7: Large Quantities

**Scenario**: Test with large quantities

**Orders to Place**:

1. **SELL** 100 XRP @ $100 (Maker order)
2. **BUY** 50 XRP @ $101 (Taker 1)
3. **BUY** 30 XRP @ $102 (Taker 2)

**Expected Result**:

- 2 trades both in green with up arrow ↑
- Large quantities displayed correctly

---

## Test Case 8: Decimal Prices

**Scenario**: Test with decimal prices

**Orders to Place**:

1. **SELL** 1 XRP @ $100.50 (Maker order)
2. **BUY** 1 XRP @ $100.75 (Taker order)

**Expected Result**:

- Trade appears in green with up arrow ↑
- Decimal prices displayed correctly

---

## Test Case 9: Same Timestamp Edge Case

**Scenario**: Orders placed at exactly the same time

**Orders to Place**:

1. **SELL** 1 XRP @ $100 (Maker order)
2. **BUY** 1 XRP @ $100 (Taker order - same timestamp)

**Expected Result**:

- Trade appears in green with up arrow ↑
- Reason: Default to BUY when timestamps are equal

---

## Test Case 10: Price Movement Pattern

**Scenario**: Simulate realistic price movement

**Orders to Place**:

1. **SELL** 2 XRP @ $100 (Initial maker)
2. **BUY** 1 XRP @ $101 (Price up - GREEN)
3. **BUY** 2 XRP @ $102 (Price up - GREEN)
4. **SELL** 1 XRP @ $101 (Price down - RED)
5. **SELL** 1 XRP @ $100 (Price down - RED)
6. **BUY** 1 XRP @ $101 (Price up - GREEN)

**Expected Result**:

- Pattern: GREEN, GREEN, RED, RED, GREEN
- Shows realistic market movement with correct colors

---

## Expected Behavior Summary:

| Taker Order Type | Color    | Arrow | Reason                          |
| ---------------- | -------- | ----- | ------------------------------- |
| BUY              | 🟢 Green | ↑     | Buyer crossed spread (bullish)  |
| SELL             | 🔴 Red   | ↓     | Seller crossed spread (bearish) |

## Key Rules:

1. **Later timestamp = Taker** (order that crossed the spread)
2. **Earlier timestamp = Maker** (order that was on the book)
3. **BUY taker = GREEN + ↑** (buy pressure)
4. **SELL taker = RED + ↓** (sell pressure)
5. **Same timestamp = Default to BUY** (aggressive buy)

This matches exactly how Binance, Backpack, and other major exchanges display trade history!
