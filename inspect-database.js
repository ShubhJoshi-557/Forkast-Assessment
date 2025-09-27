#!/usr/bin/env node

/**
 * Database Inspection Script
 *
 * This script will help inspect the database state to debug the matching algorithm
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function inspectDatabase() {
  try {
    console.log("🔍 Inspecting database state...\n");

    // 1. Check recent orders
    console.log("📋 Recent Orders:");
    console.log("=".repeat(50));

    const recentOrders = await prisma.order.findMany({
      where: {
        tradingPair: "BTC-USD",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    recentOrders.forEach((order, index) => {
      console.log(
        `${index + 1}. ${order.type} ${order.quantity} @ $${
          order.price
        } (Status: ${order.status}, Filled: ${order.filledQuantity})`
      );
      console.log(`   ID: ${order.id}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Updated: ${order.updatedAt}`);
      console.log("");
    });

    // 2. Check recent trades
    console.log("💱 Recent Trades:");
    console.log("=".repeat(50));

    const recentTrades = await prisma.trade.findMany({
      where: {
        tradingPair: "BTC-USD",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        buyOrder: {
          select: {
            id: true,
            type: true,
            price: true,
            quantity: true,
            status: true,
          },
        },
        sellOrder: {
          select: {
            id: true,
            type: true,
            price: true,
            quantity: true,
            status: true,
          },
        },
      },
    });

    recentTrades.forEach((trade, index) => {
      console.log(`${index + 1}. Trade: ${trade.quantity} @ $${trade.price}`);
      console.log(
        `   Buy Order: ${trade.buyOrder.type} ${trade.buyOrder.quantity} @ $${trade.buyOrder.price} (${trade.buyOrder.status})`
      );
      console.log(
        `   Sell Order: ${trade.sellOrder.type} ${trade.sellOrder.quantity} @ $${trade.sellOrder.price} (${trade.sellOrder.status})`
      );
      console.log(`   Created: ${trade.createdAt}`);
      console.log("");
    });

    // 3. Check for $99 buy orders specifically
    console.log("🎯 $99 Buy Orders Analysis:");
    console.log("=".repeat(50));

    const buyOrders99 = await prisma.order.findMany({
      where: {
        tradingPair: "BTC-USD",
        type: "BUY",
        price: 99,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Found ${buyOrders99.length} buy orders at $99:`);
    buyOrders99.forEach((order, index) => {
      console.log(
        `${index + 1}. ${order.quantity} quantity, ${
          order.filledQuantity
        } filled, Status: ${order.status}`
      );
    });

    // 4. Check for $90 sell orders
    console.log("\n🎯 $90 Sell Orders Analysis:");
    console.log("=".repeat(50));

    const sellOrders90 = await prisma.order.findMany({
      where: {
        tradingPair: "BTC-USD",
        type: "SELL",
        price: 90,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Found ${sellOrders90.length} sell orders at $90:`);
    sellOrders90.forEach((order, index) => {
      console.log(
        `${index + 1}. ${order.quantity} quantity, ${
          order.filledQuantity
        } filled, Status: ${order.status}`
      );
    });

    // 5. Check orderbook query (what the API returns)
    console.log("\n📊 Orderbook Query Results:");
    console.log("=".repeat(50));

    const orderbookOrders = await prisma.order.findMany({
      where: {
        tradingPair: "BTC-USD",
        status: { in: ["OPEN", "PARTIALLY_FILLED"] },
      },
      orderBy: { price: "desc" },
    });

    const bids = orderbookOrders.filter((o) => o.type === "BUY");
    const asks = orderbookOrders.filter((o) => o.type === "SELL");

    console.log(`Bids in orderbook: ${bids.length}`);
    bids.forEach((bid, index) => {
      console.log(
        `  ${index + 1}. $${bid.price} - ${bid.quantity} (${bid.status})`
      );
    });

    console.log(`\nAsks in orderbook: ${asks.length}`);
    asks.forEach((ask, index) => {
      console.log(
        `  ${index + 1}. $${ask.price} - ${ask.quantity} (${ask.status})`
      );
    });

    // 6. Summary and recommendations
    console.log("\n🔍 ANALYSIS SUMMARY:");
    console.log("=".repeat(50));

    if (buyOrders99.length > 0) {
      const open99Bids = buyOrders99.filter(
        (o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED"
      );
      const filled99Bids = buyOrders99.filter((o) => o.status === "FILLED");

      console.log(`$99 buy orders: ${buyOrders99.length} total`);
      console.log(`  - Open/Partially filled: ${open99Bids.length}`);
      console.log(`  - Filled: ${filled99Bids.length}`);

      if (open99Bids.length > 0) {
        console.log(
          "\n🚨 POTENTIAL ISSUE: There are still open $99 buy orders!"
        );
        console.log(
          "   This suggests the matching algorithm may not be working correctly."
        );
      }
    }

    if (sellOrders90.length > 0) {
      console.log(`$90 sell orders: ${sellOrders90.length} total`);
      sellOrders90.forEach((order, index) => {
        console.log(
          `  ${index + 1}. Status: ${order.status}, Filled: ${
            order.filledQuantity
          }/${order.quantity}`
        );
      });
    }

    // 7. Check for matching trades
    console.log("\n💱 Matching Analysis:");
    console.log("=".repeat(50));

    const matchingTrades = await prisma.trade.findMany({
      where: {
        tradingPair: "BTC-USD",
        OR: [
          { buyOrder: { price: 99 } },
          { sellOrder: { price: 99 } },
          { buyOrder: { price: 90 } },
          { sellOrder: { price: 90 } },
        ],
      },
      include: {
        buyOrder: { select: { price: true, type: true } },
        sellOrder: { select: { price: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(
      `Found ${matchingTrades.length} trades involving $99 or $90 orders:`
    );
    matchingTrades.forEach((trade, index) => {
      console.log(
        `${index + 1}. ${trade.quantity} @ $${trade.price} (Buy: $${
          trade.buyOrder.price
        }, Sell: $${trade.sellOrder.price})`
      );
    });
  } catch (error) {
    console.error("❌ Error inspecting database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase();
