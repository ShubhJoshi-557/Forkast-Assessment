// // In load-testing/basic-test.js
// import http from 'k6/http';
// import { check, sleep } from 'k6';

// // --- Test Configuration ---
// export const options = {
//   // Simulate 20 users concurrently.
//   vus: 10,
//   // Run the test for a total of 30 seconds.
//   duration: '30s',
// };

// const API_URL = 'http://localhost:3001/orders';
// const TRADING_PAIR = 'BTC-USD';

// // --- Test Logic ---
// export default function () {
//   // 1. Generate a random order using standard JavaScript
//   const orderType = Math.random() < 0.5 ? 'BUY' : 'SELL';

//   // Generate a random price between 90.00 and 110.00
//   const price = (Math.random() * 20 + 90).toFixed(2);

//   // Generate a random quantity between 0.1 and 5
//   const quantity = (Math.random() * 4.9 + 0.1).toFixed(4);

//   const payload = JSON.stringify({
//     tradingPair: TRADING_PAIR,
//     type: orderType,
//     price: Number(price),
//     quantity: Number(quantity),
//     userId: 1,
//   });

//   const params = {
//     headers: {
//       'Content-Type': 'application/json',
//     },
//   };

//   // 2. Send the order to the API
//   const res = http.post(API_URL, payload, params);

//   // 3. Verify the result
//   check(res, {
//     'order was successful (status 201)': (r) => r.status === 201,
//   });

//   // Wait for 1 second before the next iteration.
//   sleep(1);
// }

// load-testing/basic-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

// --- Helper function to generate random numbers ---
function random(min, max) {
  return Math.random() * (max - min) + min;
}

const API_BASE_URL = 'http://localhost:3001';
const TRADING_PAIR = 'ETH-USD';
const USER_ID = 1; // Assuming a single user for simplicity

// --- Configuration for the load test ---
export const options = {
  scenarios: {
    bidders: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      exec: 'placeBuyOrders',
    },
    askers: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      exec: 'placeSellOrders',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

// export const options = {
//   scenarios: {
//     bidders: {
//       executor: 'per-vu-iterations',
//       vus: 50,
//       iterations: 5,
//       exec: 'placeBuyOrders',
//       // The 'maxDuration' and 'gracefulStop' properties are removed
//       // to allow the test to end immediately after all iterations are done.
//     },
//     askers: {
//       executor: 'per-vu-iterations',
//       vus: 50,
//       iterations: 5,
//       exec: 'placeSellOrders',
//     },
//   },
//   thresholds: {
//     http_req_failed: ['rate<0.01'],
//     http_req_duration: ['p(95)<500'],
//   },
// };

// --- Function for the 'bidders' scenario ---
export function placeBuyOrders() {
  const url = `${API_BASE_URL}/orders`;

  const payload = JSON.stringify({
    userId: USER_ID,
    tradingPair: TRADING_PAIR,
    type: 'BUY',
    // FIX: Convert the string from .toFixed() back to a number
    price: parseFloat(random(99.5, 100.5).toFixed(2)),
    quantity: parseFloat(random(0.1, 1.0).toFixed(4)),
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);

  check(res, { 'BUY order submitted successfully': (r) => r.status === 201 });

  sleep(random(0.5, 2));
}

// --- Function for the 'askers' scenario ---
export function placeSellOrders() {
  const url = `${API_BASE_URL}/orders`;

  const payload = JSON.stringify({
    userId: USER_ID,
    tradingPair: TRADING_PAIR,
    type: 'SELL',
    // FIX: Convert the string from .toFixed() back to a number
    price: parseFloat(random(99.5, 100.5).toFixed(2)),
    quantity: parseFloat(random(0.1, 1.0).toFixed(4)),
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);

  check(res, { 'SELL order submitted successfully': (r) => r.status === 201 });

  sleep(random(0.5, 2));
}