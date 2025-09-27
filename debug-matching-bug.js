#!/usr/bin/env node

/**
 * Debug Script for Matching Algorithm Bug
 * 
 * This script will help debug the issue where:
 * - Buy orders at $99 should be matched by sell order at $90
 * - But the orderbook still shows the $99 buy orders
 */

const axios = require('axios');
const WebSocket = require('ws');

// Configuration
const API_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001';
const TRADING_PAIR = 'BTC-USD';

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class MatchingDebugger {
  constructor() {
    this.ws = null;
    this.receivedEvents = [];
    this.testResults = [];
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      log('cyan', '🔌 Connecting to WebSocket...');
      
      this.ws = new WebSocket(`ws://localhost:3001`);
      
      this.ws.on('open', () => {
        log('green', '✅ WebSocket connected');
        
        // Subscribe to the trading pair
        this.ws.send(JSON.stringify({
          event: 'subscribe',
          data: { room: TRADING_PAIR }
        }));
        
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.receivedEvents.push({
            timestamp: new Date(),
            type: message.event || 'unknown',
            data: message
          });
          
          log('yellow', `📨 Received: ${message.event || 'unknown'}`);
        } catch (error) {
          log('red', `❌ Error parsing WebSocket message: ${error.message}`);
        }
      });
      
      this.ws.on('error', (error) => {
        log('red', `❌ WebSocket error: ${error.message}`);
        reject(error);
      });
    });
  }

  async getOrderBook() {
    try {
      log('cyan', '📊 Fetching current orderbook...');
      const response = await axios.get(`${API_URL}/market/${TRADING_PAIR}/orderbook`);
      return response.data;
    } catch (error) {
      log('red', `❌ Error fetching orderbook: ${error.message}`);
      throw error;
    }
  }

  async getRecentTrades() {
    try {
      log('cyan', '📈 Fetching recent trades...');
      const response = await axios.get(`${API_URL}/market/${TRADING_PAIR}/trades`);
      return response.data;
    } catch (error) {
      log('red', `❌ Error fetching trades: ${error.message}`);
      throw error;
    }
  }

  async placeOrder(orderData) {
    try {
      log('cyan', `📝 Placing order: ${orderData.type} ${orderData.quantity} @ $${orderData.price}`);
      const response = await axios.post(`${API_URL}/orders`, {
        ...orderData,
        tradingPair: TRADING_PAIR,
        userId: 1
      });
      return response.data;
    } catch (error) {
      log('red', `❌ Error placing order: ${error.message}`);
      throw error;
    }
  }

  async waitForEvents(timeoutMs = 10000) {
    log('cyan', `⏳ Waiting for events (${timeoutMs}ms timeout)...`);
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= timeoutMs) {
          clearInterval(checkInterval);
          log('yellow', '⏰ Timeout reached, stopping event collection');
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, timeoutMs);
    });
  }

  analyzeResults() {
    log('magenta', '\n🔍 ANALYSIS RESULTS:');
    log('white', '='.repeat(50));
    
    // Analyze orderbook changes
    const initialOrderbook = this.testResults.find(r => r.type === 'initial_orderbook');
    const finalOrderbook = this.testResults.find(r => r.type === 'final_orderbook');
    
    if (initialOrderbook && finalOrderbook) {
      log('cyan', '\n📊 Orderbook Changes:');
      
      const initialBids = initialOrderbook.data.bids || [];
      const finalBids = finalOrderbook.data.bids || [];
      
      log('white', `Initial bids: ${initialBids.length}`);
      log('white', `Final bids: ${finalBids.length}`);
      
      // Check for $99 orders
      const initial99Bids = initialBids.filter(bid => Number(bid.price) === 99);
      const final99Bids = finalBids.filter(bid => Number(bid.price) === 99);
      
      log('yellow', `$99 bids initially: ${initial99Bids.length}`);
      log('yellow', `$99 bids finally: ${final99Bids.length}`);
      
      if (initial99Bids.length > 0 && final99Bids.length > 0) {
        log('red', '🚨 BUG CONFIRMED: $99 buy orders still present after sell order!');
      } else if (initial99Bids.length > 0 && final99Bids.length === 0) {
        log('green', '✅ SUCCESS: $99 buy orders were properly matched and removed');
      }
    }
    
    // Analyze WebSocket events
    log('cyan', '\n📡 WebSocket Events:');
    const tradeEvents = this.receivedEvents.filter(e => e.type === 'new_trade');
    const orderEvents = this.receivedEvents.filter(e => e.type === 'order_update');
    
    log('white', `Trade events received: ${tradeEvents.length}`);
    log('white', `Order update events received: ${orderEvents.length}`);
    
    if (tradeEvents.length === 0) {
      log('red', '🚨 NO TRADE EVENTS: Matching engine may not be working!');
    }
    
    if (orderEvents.length === 0) {
      log('red', '🚨 NO ORDER UPDATE EVENTS: Order updates may not be working!');
    }
    
    // Analyze trades
    const trades = this.testResults.find(r => r.type === 'trades');
    if (trades && trades.data) {
      log('cyan', '\n💱 Trades Created:');
      trades.data.forEach((trade, index) => {
        log('white', `Trade ${index + 1}: ${trade.quantity} @ $${trade.price}`);
      });
    }
  }

  async runDebugTest() {
    try {
      log('blue', '🚀 Starting Matching Algorithm Debug Test');
      log('white', '='.repeat(50));
      
      // Step 1: Connect to WebSocket
      await this.connectWebSocket();
      
      // Step 2: Get initial state
      log('cyan', '\n📊 Step 1: Capturing initial state...');
      const initialOrderbook = await this.getOrderBook();
      const initialTrades = await this.getRecentTrades();
      
      this.testResults.push({
        type: 'initial_orderbook',
        timestamp: new Date(),
        data: initialOrderbook
      });
      
      this.testResults.push({
        type: 'initial_trades',
        timestamp: new Date(),
        data: initialTrades
      });
      
      log('white', `Initial bids: ${initialOrderbook.bids.length}`);
      log('white', `Initial asks: ${initialOrderbook.asks.length}`);
      
      // Step 3: Place the problematic sell order
      log('cyan', '\n📝 Step 2: Placing sell order at $90 for 999 quantity...');
      const sellOrder = {
        type: 'SELL',
        price: 90,
        quantity: 999
      };
      
      await this.placeOrder(sellOrder);
      
      // Step 4: Wait for events and processing
      log('cyan', '\n⏳ Step 3: Waiting for matching engine to process...');
      await this.waitForEvents(15000); // Wait 15 seconds
      
      // Step 5: Get final state
      log('cyan', '\n📊 Step 4: Capturing final state...');
      const finalOrderbook = await this.getOrderBook();
      const finalTrades = await this.getRecentTrades();
      
      this.testResults.push({
        type: 'final_orderbook',
        timestamp: new Date(),
        data: finalOrderbook
      });
      
      this.testResults.push({
        type: 'final_trades',
        timestamp: new Date(),
        data: finalTrades
      });
      
      log('white', `Final bids: ${finalOrderbook.bids.length}`);
      log('white', `Final asks: ${finalOrderbook.asks.length}`);
      
      // Step 6: Analyze results
      this.analyzeResults();
      
      // Step 7: Generate detailed report
      this.generateReport();
      
    } catch (error) {
      log('red', `❌ Debug test failed: ${error.message}`);
      console.error(error);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }

  generateReport() {
    log('magenta', '\n📋 DETAILED DEBUG REPORT:');
    log('white', '='.repeat(50));
    
    // Save results to file
    const report = {
      timestamp: new Date().toISOString(),
      tradingPair: TRADING_PAIR,
      testResults: this.testResults,
      webSocketEvents: this.receivedEvents,
      summary: {
        totalEvents: this.receivedEvents.length,
        tradeEvents: this.receivedEvents.filter(e => e.type === 'new_trade').length,
        orderEvents: this.receivedEvents.filter(e => e.type === 'order_update').length
      }
    };
    
    const fs = require('fs');
    const filename = `debug-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    log('green', `📄 Detailed report saved to: ${filename}`);
    
    // Print summary
    log('cyan', '\n📊 SUMMARY:');
    log('white', `Total WebSocket events: ${this.receivedEvents.length}`);
    log('white', `Trade events: ${report.summary.tradeEvents}`);
    log('white', `Order update events: ${report.summary.orderEvents}`);
    
    if (report.summary.tradeEvents === 0) {
      log('red', '🚨 CRITICAL: No trade events received - matching engine may be broken!');
    }
    
    if (report.summary.orderEvents === 0) {
      log('red', '🚨 CRITICAL: No order update events received - order updates may be broken!');
    }
  }
}

// Run the debug test
async function main() {
  const debugger = new MatchingDebugger();
  await debugger.runDebugTest();
}

main().catch(console.error);
