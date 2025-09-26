// import { useState, useEffect, useCallback } from 'react';
// import io, { Socket } from 'socket.io-client';
// import axios from 'axios';

// // Define the data structures for type safety
// interface Order {
//   price: string;
//   quantity: string;
// }
// interface Trade {
//   id: string;
//   price: string;
//   quantity: string;
//   createdAt: string;
//   tradingPair: string;
// }

// const SOCKET_URL = 'http://localhost:3001';
// const API_URL = 'http://localhost:3001';

// export function useOrderbookSocket(tradingPair: string) {
//   const [trades, setTrades] = useState<Trade[]>([]);
//   const [orderBook, setOrderBook] = useState<{ bids: Order[]; asks: Order[] }>({ bids: [], asks: [] });

//   // A stable function to fetch the latest order book state.
//   const fetchOrderBook = useCallback(async () => {
//     if (!tradingPair) return;
//     try {
//       const response = await axios.get(`${API_URL}/market/${tradingPair}/orderbook`);
//       setOrderBook(response.data);
//     } catch (error) {
//       console.error(`Failed to fetch order book for ${tradingPair}:`, error);
//     }
//   }, [tradingPair]);

//   // A stable function for the UI to call when placing an order.
//   const placeOrder = useCallback(async (orderData: { type: 'BUY' | 'SELL', price: number, quantity: number }) => {
//     if (!tradingPair) {
//       throw new Error("Cannot place order, no market selected.");
//     }
//     try {
//       await axios.post(`${API_URL}/orders`, { ...orderData, tradingPair, userId: 1 });
//       setTimeout(() => fetchOrderBook(), 300);
//     } catch (error: any) {
//       throw new Error(error.response?.data?.message || 'An unknown error occurred');
//     }
//   }, [tradingPair, fetchOrderBook]);

//   // A single, unified useEffect to manage the entire socket lifecycle for the selected market.
//   useEffect(() => {
//     if (!tradingPair) {
//       return;
//     }

//     console.log(`--- Setting up connection for ${tradingPair} ---`);

//     const socket = io(SOCKET_URL, {
//       transports: ['websocket'],
//       upgrade: false,
//     });

//     const handleNewTrade = (newTrade: Trade) => {
//       if (newTrade.tradingPair === tradingPair) {
//         console.log(`✅ Received new_trade for ${tradingPair}:`, newTrade);
//         setTrades((prev) => [newTrade, ...prev].slice(0, 50));
//         fetchOrderBook();
//       }
//     };

//     const handleOrderUpdate = (updatedOrder: { tradingPair: string }) => {
//       if (updatedOrder.tradingPair === tradingPair) {
//         console.log(`✅ Received order_update for ${tradingPair}, refetching...`);
//         fetchOrderBook();
//       }
//     };

//     socket.on('connect', () => {
//       console.log(`✅ WebSocket connected: ${socket.id}. Subscribing to ${tradingPair}`);
//       // UPDATED: Send a structured object for the subscription payload.
//       socket.emit('subscribe', { room: tradingPair });
//     });

//     socket.on('new_trade', handleNewTrade);
//     socket.on('order_update', handleOrderUpdate);

//     const fetchInitialData = async () => {
//       try {
//         const initialTrades = await axios.get(`${API_URL}/market/${tradingPair}/trades`);
//         setTrades(initialTrades.data);
//         await fetchOrderBook();
//       } catch (error) {
//         console.error(`Failed to fetch initial data for ${tradingPair}:`, error);
//       }
//     };
//     fetchInitialData();

//     // The cleanup function is crucial for preventing memory leaks and bugs.
//     return () => {
//       console.log(`--- Tearing down connection for ${tradingPair} ---`);
//       // UPDATED: Send an object for the unsubscribe payload.
//       socket.emit('unsubscribe', { room: tradingPair });
//       socket.off('connect');
//       socket.off('new_trade', handleNewTrade);
//       socket.off('order_update', handleOrderUpdate);
//       socket.disconnect();
//     };

//   }, [tradingPair, fetchOrderBook]);

//   return { trades, orderBook, placeOrder };
// }

// ==================================================================================================================

// import { useState, useEffect, useCallback, useRef } from 'react';
// import io, { Socket } from 'socket.io-client';
// import axios from 'axios';

// // Define the data structures for type safety
// interface Order {
//   price: string;
//   quantity: string;
// }
// interface Trade {
//   id: string;
//   price: string;
//   quantity: string;
//   createdAt: string;
//   tradingPair: string;
// }

// const SOCKET_URL = 'http://localhost:3001';
// const API_URL = 'http://localhost:3001';

// export function useOrderbookSocket(tradingPair: string) {
//   const [trades, setTrades] = useState<Trade[]>([]);
//   const [orderBook, setOrderBook] = useState<{ bids: Order[]; asks: Order[] }>({ bids: [], asks: [] });
//   // Use a ref to hold the socket instance to prevent issues with stale closures
//   const socketRef = useRef<Socket | null>(null);

//   // A stable function to fetch the latest order book state.
//   const fetchOrderBook = useCallback(async () => {
//     if (!tradingPair) return;
//     try {
//       const response = await axios.get(`${API_URL}/market/${tradingPair}/orderbook`);
//       setOrderBook(response.data);
//     } catch (error) {
//       console.error(`Failed to fetch order book for ${tradingPair}:`, error);
//     }
//   }, [tradingPair]);

//   // A stable function for the UI to call when placing an order.
//   const placeOrder = useCallback(async (orderData: { type: 'BUY' | 'SELL', price: number, quantity: number }) => {
//     if (!tradingPair) {
//       throw new Error("Cannot place order, no market selected.");
//     }
//     try {
//       // NOTE: We don't need the setTimeout anymore because the WebSocket will tell us when to update.
//       await axios.post(`${API_URL}/orders`, { ...orderData, tradingPair, userId: 1 });
//     } catch (error: any) {
//       throw new Error(error.response?.data?.message || 'An unknown error occurred');
//     }
//   }, [tradingPair]);

//   // A single, unified useEffect to manage the entire socket lifecycle.
//   useEffect(() => {
//     if (!tradingPair) {
//       return;
//     }

//     // Fetch initial data when the tradingPair changes.
//     const fetchInitialData = async () => {
//       try {
//         const [tradesRes, orderbookRes] = await Promise.all([
//           axios.get(`${API_URL}/market/${tradingPair}/trades`),
//           axios.get(`${API_URL}/market/${tradingPair}/orderbook`),
//         ]);
//         setTrades(tradesRes.data);
//         setOrderBook(orderbookRes.data);
//       } catch (error) {
//         console.error(`Failed to fetch initial data for ${tradingPair}:`, error);
//       }
//     };
//     fetchInitialData();

//     // Establish the socket connection.
//     const socket = io(SOCKET_URL, {
//       transports: ['websocket'],
//     });
//     socketRef.current = socket;

//     // --- FIX 1: Re-subscribe on every connection event ---
//     // This handles initial connection, and automatic re-connections after a disconnect or refresh.
//     const handleConnect = () => {
//       console.log(`✅ WebSocket connected: ${socket.id}. Subscribing to ${tradingPair}`);
//       socket.emit('subscribe', { room: tradingPair });
//     };

//     const handleNewTrade = (newTrade: Trade) => {
//       if (newTrade.tradingPair === tradingPair) {
//         console.log(`✅ Received new_trade for ${tradingPair}:`, newTrade);
//         // FIX 2: Update state directly from the event. No need for another HTTP fetch.
//         setTrades((prev) => [newTrade, ...prev].slice(0, 50));
//       }
//     };

//     const handleOrderUpdate = () => {
//         // This event signifies a change in the order book. We refetch it.
//         // In a more advanced implementation, this event would contain the data "delta"
//         // to avoid a full refetch, but for now, this is reliable.
//         console.log(`✅ Received order_update for ${tradingPair}, refetching order book...`);
//         fetchOrderBook();
//     };

//     socket.on('connect', handleConnect);
//     socket.on('new_trade', handleNewTrade);
//     socket.on('order_update', handleOrderUpdate);

//     // --- FIX 3: Simplified and more robust cleanup logic ---
//     return () => {
//       console.log(`--- Tearing down connection for ${tradingPair} ---`);
//       if (socketRef.current) {
//         // Just disconnecting is enough. It cleans up all listeners on the client side.
//         socketRef.current.disconnect();
//       }
//     };
//   }, [tradingPair, fetchOrderBook]); // fetchOrderBook is stable due to useCallback

//   return { trades, orderBook, placeOrder };
// }

import axios from "axios";

import { useCallback, useEffect, useRef, useState } from "react";

import io, { Socket } from "socket.io-client";

// Interfaces remain the same...

interface Order {
  price: string;

  quantity: string;
}

interface Trade {
  id: string;

  price: string;

  quantity: string;

  createdAt: string;

  tradingPair: string;
}

const SOCKET_URL = "http://localhost:3001";

const API_URL = "http://localhost:3001";

export function useOrderbookSocket(tradingPair: string) {
  const [trades, setTrades] = useState<Trade[]>([]);

  const [orderBook, setOrderBook] = useState<{ bids: Order[]; asks: Order[] }>({
    bids: [],

    asks: [],
  });

  const socketRef = useRef<Socket | null>(null);

  // --- NEW: A ref to hold the timer for our debounce logic ---

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrderBook = useCallback(async () => {
    if (!tradingPair) return;

    try {
      const response = await axios.get(
        `${API_URL}/market/${tradingPair}/orderbook`
      );

      setOrderBook(response.data);
    } catch (error) {
      console.error(`Failed to fetch order book for ${tradingPair}:`, error);
    }
  }, [tradingPair]);

  // --- NEW: A debounced version of our fetch function ---

  const debouncedFetchOrderBook = useCallback(() => {
    // Clear any existing timer

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer

    debounceTimerRef.current = setTimeout(() => {
      console.log("Debounced fetch triggered!");

      fetchOrderBook();
    }, 1); // Wait 200ms after the last event before fetching
  }, [fetchOrderBook]);

  const placeOrder = useCallback(
    async (orderData: {
      type: "BUY" | "SELL";

      price: number;

      quantity: number;
    }) => {
      if (!tradingPair) {
        throw new Error("Cannot place order, no market selected.");
      }

      try {
        // NOTE: We don't need the setTimeout anymore because the WebSocket will tell us when to update.

        await axios.post(`${API_URL}/orders`, {
          ...orderData,

          tradingPair,

          userId: 1,
        });
      } catch (error: any) {
        throw new Error(
          error.response?.data?.message || "An unknown error occurred"
        );
      }
    },

    [tradingPair]
  );

  useEffect(() => {
    if (!tradingPair) return;

    // ... fetchInitialData and socket setup remain the same ...

    // --- UPDATED: The handler now calls the debounced function ---

    const handleOrderUpdate = () => {
      console.log(`✅ Received order_update, queueing debounced fetch...`);

      debouncedFetchOrderBook();
    };

    // ... The rest of the useEffect (socket connection, other handlers, cleanup) remains the same as the last version ...

    // --- For clarity, the full useEffect is included below ---

    const fetchInitialData = async () => {
      try {
        const [tradesRes, orderbookRes] = await Promise.all([
          axios.get(`${API_URL}/market/${tradingPair}/trades`),

          axios.get(`${API_URL}/market/${tradingPair}/orderbook`),
        ]);

        setTrades(tradesRes.data);

        setOrderBook(orderbookRes.data);
      } catch (error) {
        console.error(
          `Failed to fetch initial data for ${tradingPair}:`,

          error
        );
      }
    };

    fetchInitialData();

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],

      autoConnect: false,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      console.log(
        `✅ WebSocket connected: ${socket.id}. Subscribing to ${tradingPair}`
      );

      socket.emit("subscribe", { room: tradingPair });
    };

    const handleNewTrade = (newTrade: Trade) => {
      if (newTrade.tradingPair === tradingPair) {
        setTrades((prev) => [newTrade, ...prev].slice(0, 50));
      }
    };

    socket.on("connect", handleConnect);

    socket.on("new_trade", handleNewTrade);

    socket.on("order_update", handleOrderUpdate); // This handler now calls the debounced function

    socket.connect();

    return () => {
      console.log(`--- Tearing down connection for ${tradingPair} ---`);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [tradingPair, fetchOrderBook, debouncedFetchOrderBook]);

  return { trades, orderBook, placeOrder };
}
