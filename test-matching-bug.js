#!/usr/bin/env node

/**
 * Test Script to Reproduce Matching Algorithm Bug
 *
 * This script will:
 * 1. Create some $99 buy orders
 * 2. Place a $90 sell order for 999 quantity
 * 3. Check if the $99 buy orders are properly matched
 */

const axios = require("axios");

const API_URL = "http://localhost:3001";
const TRADING_PAIR = "BTC-USD";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function placeOrder(type, price, quantity) {
  try {
    console.log(`📝 Placing ${type} order: ${quantity} @ $${price}`);
    const response = await axios.post(`${API_URL}/orders`, {
      type,
      price,
      quantity,
      tradingPair: TRADING_PAIR,
      userId: 1,
    });
    console.log(`✅ Order placed successfully`);
    return response.data;
  } catch (error) {
    console.error(
      `❌ Error placing order:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getOrderBook() {
  try {
    const response = await axios.get(
      `${API_URL}/market/${TRADING_PAIR}/orderbook`
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching orderbook:`, error.message);
    throw error;
  }
}

async function getTrades() {
  try {
    const response = await axios.get(
      `${API_URL}/market/${TRADING_PAIR}/trades`
    );
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching trades:`, error.message);
    throw error;
  }
}

function logOrderBook(orderBook, title) {
  console.log(`\n📊 ${title}:`);
  console.log("=".repeat(40));

  console.log(`Bids (${orderBook.bids.length}):`);
  orderBook.bids.forEach((bid, index) => {
    console.log(
      `  ${index + 1}. $${bid.price} - ${bid.quantity} (${bid.status || "N/A"})`
    );
  });

  console.log(`\nAsks (${orderBook.asks.length}):`);
  orderBook.asks.forEach((ask, index) => {
    console.log(
      `  ${index + 1}. $${ask.price} - ${ask.quantity} (${ask.status || "N/A"})`
    );
  });
}

function logTrades(trades, title) {
  console.log(`\n💱 ${title}:`);
  console.log("=".repeat(40));

  trades.slice(0, 5).forEach((trade, index) => {
    console.log(
      `  ${index + 1}. ${trade.quantity} @ $${trade.price} (${new Date(
        trade.createdAt
      ).toLocaleTimeString()})`
    );
  });

  if (trades.length > 5) {
    console.log(`  ... and ${trades.length - 5} more trades`);
  }
}

async function runTest() {
  try {
    console.log("🚀 Starting Matching Algorithm Bug Test");
    console.log("=".repeat(50));

    // Step 1: Get initial state
    console.log("\n📊 Step 1: Getting initial state...");
    const initialOrderBook = await getOrderBook();
    const initialTrades = await getTrades();

    logOrderBook(initialOrderBook, "Initial OrderBook");
    logTrades(initialTrades, "Initial Trades");

    // Step 2: Create some $99 buy orders
    console.log("\n📝 Step 2: Creating $99 buy orders...");
    const buyOrders = [
      { price: 99, quantity: 10 },
      { price: 99, quantity: 15 },
      { price: 99, quantity: 20 },
      { price: 99, quantity: 25 },
    ];

    for (const order of buyOrders) {
      await placeOrder("BUY", order.price, order.quantity);
      await sleep(1000); // Wait 1 second between orders
    }

    // Step 3: Check orderbook after buy orders
    console.log("\n📊 Step 3: Checking orderbook after buy orders...");
    await sleep(2000); // Wait for processing
    const afterBuyOrderBook = await getOrderBook();
    logOrderBook(afterBuyOrderBook, "OrderBook After Buy Orders");

    // Step 4: Place the problematic sell order
    console.log("\n📝 Step 4: Placing $90 sell order for 999 quantity...");
    await placeOrder("SELL", 90, 999);

    // Step 5: Wait for matching engine to process
    console.log("\n⏳ Step 5: Waiting for matching engine to process...");
    await sleep(10000); // Wait 10 seconds

    // Step 6: Check final state
    console.log("\n📊 Step 6: Checking final state...");
    const finalOrderBook = await getOrderBook();
    const finalTrades = await getTrades();

    logOrderBook(finalOrderBook, "Final OrderBook");
    logTrades(finalTrades, "Final Trades");

    // Step 7: Analysis
    console.log("\n🔍 ANALYSIS:");
    console.log("=".repeat(50));

    const initial99Bids = initialOrderBook.bids.filter(
      (bid) => Number(bid.price) === 99
    );
    const final99Bids = finalOrderBook.bids.filter(
      (bid) => Number(bid.price) === 99
    );

    console.log(`Initial $99 bids: ${initial99Bids.length}`);
    console.log(`Final $99 bids: ${final99Bids.length}`);

    if (initial99Bids.length > 0 && final99Bids.length > 0) {
      console.log("\n🚨 BUG CONFIRMED: $99 buy orders are still present!");
      console.log(
        "   This indicates the matching algorithm is not working correctly."
      );

      console.log("\nRemaining $99 bids:");
      final99Bids.forEach((bid, index) => {
        console.log(
          `  ${index + 1}. $${bid.price} - ${bid.quantity} (${
            bid.status || "N/A"
          })`
        );
      });
    } else if (initial99Bids.length > 0 && final99Bids.length === 0) {
      console.log(
        "\n✅ SUCCESS: $99 buy orders were properly matched and removed!"
      );
    } else {
      console.log("\n⚠️  No $99 bids found initially - test may not be valid");
    }

    // Check for $90 sell order
    const sellOrders90 = finalOrderBook.asks.filter(
      (ask) => Number(ask.price) === 90
    );
    console.log(`\n$90 sell orders in final orderbook: ${sellOrders90.length}`);

    if (sellOrders90.length > 0) {
      console.log("Remaining $90 sell orders:");
      sellOrders90.forEach((ask, index) => {
        console.log(
          `  ${index + 1}. $${ask.price} - ${ask.quantity} (${
            ask.status || "N/A"
          })`
        );
      });
    }

    // Check for new trades
    const newTrades = finalTrades.filter(
      (trade) => new Date(trade.createdAt) > new Date(Date.now() - 30000) // Last 30 seconds
    );
    console.log(`\nNew trades created: ${newTrades.length}`);

    if (newTrades.length === 0) {
      console.log("\n🚨 CRITICAL: No new trades were created!");
      console.log("   This suggests the matching engine is completely broken.");
    } else {
      console.log("Recent trades:");
      newTrades.slice(0, 5).forEach((trade, index) => {
        console.log(`  ${index + 1}. ${trade.quantity} @ $${trade.price}`);
      });
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error);
  }
}

runTest();
