# Debug Instructions for Matching Algorithm Bug

## 🚨 Problem Description

- You have buy orders at $99
- You place a sell order at $90 for 999 quantity
- The orderbook should show the $99 buy orders being matched and removed
- But the $99 buy orders are still showing in the orderbook

## 🔧 Debugging Steps

### Step 1: Install Dependencies

```bash
# Install the debug dependencies
npm install --save-dev axios ws @prisma/client

# Or copy the package-debug.json to package.json and run:
npm install
```

### Step 2: Run the Database Inspection

```bash
# This will show you the current state of orders and trades in the database
node inspect-database.js
```

**What to look for:**

- Are there $99 buy orders with status `OPEN` or `PARTIALLY_FILLED`?
- Are there $90 sell orders?
- Are there any trades between $99 and $90 orders?
- What is the `filledQuantity` vs `quantity` for these orders?

### Step 3: Run the Test Script

```bash
# This will reproduce the exact issue step by step
node test-matching-bug.js
```

**What to look for:**

- Does the test create $99 buy orders successfully?
- Does the $90 sell order get placed?
- Are the $99 buy orders still present after the sell order?
- Are any trades created?

### Step 4: Run the Comprehensive Debug Script

```bash
# This will monitor WebSocket events and provide detailed analysis
node debug-matching-bug.js
```

**What to look for:**

- Are WebSocket events being received?
- Are trade events being published?
- Are order update events being published?
- What is the timing of events?

## 🔍 Expected Behavior vs Actual Behavior

### Expected Behavior:

1. Place $99 buy orders → They appear in orderbook
2. Place $90 sell order → Should match against $99 buy orders
3. $99 buy orders should become `FILLED` and disappear from orderbook
4. $90 sell order should be `PARTIALLY_FILLED` with remaining quantity
5. Trades should be created for each match

### Actual Behavior (Bug):

- $99 buy orders remain in orderbook after $90 sell order
- This suggests the matching algorithm is not working

## 🚨 Potential Root Causes

### 1. Matching Engine Not Running

- Check if the matching engine service is running
- Look for Kafka consumer errors
- Verify Kafka topics exist

### 2. Database Transaction Issues

- Orders might not be getting updated properly
- Status changes might not be committed
- Race conditions in concurrent processing

### 3. WebSocket Update Issues

- Order updates might not be reaching the frontend
- WebSocket connection might be broken
- Event broadcasting might be failing

### 4. API Query Issues

- The orderbook API might be querying the wrong data
- Status filtering might be incorrect
- Caching issues

## 🔧 Quick Fixes to Try

### Fix 1: Restart Services

```bash
# Restart all services
docker-compose down
docker-compose up -d

# Or if using PM2
pm2 restart all
```

### Fix 2: Check Kafka Topics

```bash
# Check if Kafka topics exist
kafka-topics --bootstrap-server localhost:9092 --list

# Check topic details
kafka-topics --bootstrap-server localhost:9092 --describe --topic orders.new
kafka-topics --bootstrap-server localhost:9092 --describe --topic trades.executed
kafka-topics --bootstrap-server localhost:9092 --describe --topic orders.updated
```

### Fix 3: Check Database Connection

```bash
# Test database connection
npx prisma db pull
npx prisma generate
```

### Fix 4: Check WebSocket Connection

- Open browser dev tools
- Check Network tab for WebSocket connection
- Look for WebSocket errors in console

## 📊 Debug Output Analysis

### If Database Inspection Shows:

- **$99 orders with status `OPEN`**: Matching engine is not processing them
- **No trades between $99 and $90**: Matching algorithm is broken
- **$90 order with status `OPEN`**: Sell order is not being processed

### If Test Script Shows:

- **No trades created**: Matching engine is completely broken
- **$99 orders still present**: Matching is not working
- **WebSocket errors**: Communication issues

### If Debug Script Shows:

- **No WebSocket events**: Event system is broken
- **No trade events**: Matching engine is not publishing trades
- **No order update events**: Order updates are not being published

## 🎯 Next Steps Based on Results

### If Matching Engine is Broken:

1. Check matching engine logs
2. Verify Kafka consumer is working
3. Check database transactions

### If WebSocket is Broken:

1. Check WebSocket service logs
2. Verify Redis connection
3. Check frontend WebSocket connection

### If Database is Broken:

1. Check database connection
2. Verify Prisma schema
3. Check for transaction rollbacks

## 📞 Getting Help

If you're still stuck after running these debug scripts, please share:

1. The output of `inspect-database.js`
2. The output of `test-matching-bug.js`
3. The output of `debug-matching-bug.js`
4. Any error logs from the services

This will help identify the exact root cause of the matching algorithm bug.
