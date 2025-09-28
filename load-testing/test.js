import http from 'k6/http';
import { check, sleep } from 'k6';

// --- Helper function to generate random numbers ---
function random(min, max) {
  return Math.random() * (max - min) + min;
}

const API_BASE_URL = 'http://localhost:3001';
const USER_ID = 1; // Assuming a single user for simplicity
const TRADING_PAIRS = [
  "BTC-USD","ETH-USD","SOL-USD","BNB-USD","XRP-USD",
  "ADA-USD","DOGE-USD","AVAX-USD","MATIC-USD","DOT-USD"
];

// --- Configuration for the load test ---
export const options = {
  scenarios: {
    orders: {
      executor: 'constant-vus',
      vus: 10,               // 35 VUs
      duration: '1m',
      exec: 'placeOrders',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

// --- Function for placing random orders ---
export function placeOrders() {
  const tradingPair = TRADING_PAIRS[Math.floor(Math.random() * TRADING_PAIRS.length)];
  const orderType = Math.random() < 0.5 ? 'BUY' : 'SELL';

  const payload = JSON.stringify({
    userId: USER_ID,
    tradingPair: tradingPair,
    type: orderType,
    price: parseFloat(random(99.5, 100.5).toFixed(2)),
    quantity: parseFloat(random(0.1, 1.0).toFixed(4)),
  });

  const params = { headers: { 'Content-Type': 'application/json' } };

  const res = http.post(`${API_BASE_URL}/orders`, payload, params);
  check(res, { 'order submitted': (r) => r.status === 201 });

  sleep(random(0.05, 0.07)); // Random small delay to spread load
}
