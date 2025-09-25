// In load-testing/basic-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

// --- Test Configuration ---
export const options = {
  // Simulate 20 users concurrently.
  vus: 10,
  // Run the test for a total of 30 seconds.
  duration: '30s',
};

const API_URL = 'http://localhost:3001/orders';
const TRADING_PAIR = 'BTC-USD';

// --- Test Logic ---
export default function () {
  // 1. Generate a random order using standard JavaScript
  const orderType = Math.random() < 0.5 ? 'BUY' : 'SELL';
  
  // Generate a random price between 90.00 and 110.00
  const price = (Math.random() * 20 + 90).toFixed(2);
  
  // Generate a random quantity between 0.1 and 5
  const quantity = (Math.random() * 4.9 + 0.1).toFixed(4);

  const payload = JSON.stringify({
    tradingPair: TRADING_PAIR,
    type: orderType,
    price: Number(price),
    quantity: Number(quantity),
    userId: 1,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 2. Send the order to the API
  const res = http.post(API_URL, payload, params);

  // 3. Verify the result
  check(res, {
    'order was successful (status 201)': (r) => r.status === 201,
  });

  // Wait for 1 second before the next iteration.
  sleep(1);
}