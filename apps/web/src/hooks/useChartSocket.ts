// // apps/web/src/hooks/useChartSocket.ts
// import axios from "axios";
// import { UTCTimestamp } from "lightweight-charts";
// import { useEffect, useRef, useState } from "react";
// import io, { Socket } from "socket.io-client";

// export interface Candle {
//   time: UTCTimestamp;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume?: number;
// }

// const SOCKET_URL = "http://localhost:3001";
// const API_URL = "http://localhost:3001";

// export function useChartSocket(tradingPair: string, interval: string) {
//   const [candles, setCandles] = useState<Candle[]>([]);
//   const socketRef = useRef<Socket | null>(null);
//   // --- 1. Add a ref to track the latest request ID ---
//   const latestRequestRef = useRef(0);

//   useEffect(() => {
//     if (!tradingPair || !interval) return;

//     // --- 2. Create a unique ID for this specific fetch request ---
//     const requestId = ++latestRequestRef.current;

//     setCandles([]);

//     const fetchInitialData = async () => {
//       try {
//         const response = await axios.get<Candle[]>(
//           `${API_URL}/charts/${tradingPair}/candles?interval=${interval}`
//         );

//         // --- 3. Only update state if this is the most recent request ---
//         if (requestId === latestRequestRef.current) {
//           const formattedData = response.data.map((c) => ({
//             ...c,
//             time: c.time as UTCTimestamp,
//           }));
//           setCandles(formattedData);
//         } else {
//           // This logs when we successfully ignore a stale request
//           console.log(`Ignoring stale request #${requestId}`);
//         }
//       } catch (error) {
//         console.error(
//           `Failed to fetch initial candle data for ${tradingPair}:`,
//           error
//         );
//       }
//     };
//     fetchInitialData();

//     // ... (socket connection and handlers remain the same)

//     const socket = io(SOCKET_URL, {
//       transports: ["websocket"],
//       autoConnect: false,
//     });
//     socketRef.current = socket;
//     const handleConnect = () => {
//       console.log(
//         `[ChartSocket] Connected: ${socket.id}. Subscribing to ${tradingPair}`
//       );
//       socket.emit("subscribe", { room: tradingPair });
//     };

//     const handleCandleUpdate = (updatedCandle: Candle) => {
//       const formattedCandle = {
//         ...updatedCandle,
//         time: updatedCandle.time as UTCTimestamp,
//       };
//       setCandles((prevCandles) => {
//         if (
//           prevCandles.length > 0 &&
//           prevCandles[prevCandles.length - 1].time === formattedCandle.time
//         ) {
//           const newCandles = [...prevCandles];
//           newCandles[newCandles.length - 1] = formattedCandle;
//           return newCandles;
//         } else {
//           return [...prevCandles, formattedCandle];
//         }
//       });
//     };

//     socket.on("connect", handleConnect);
//     socket.on("candle_update", handleCandleUpdate);
//     socket.connect();

//     return () => {
//       // On cleanup, increment the ref again to invalidate any in-flight requests
//       latestRequestRef.current++;
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//       }
//     };
//   }, [tradingPair, interval]);

//   return { candles };
// }

// apps/web/src/hooks/useChartSocket.ts
// import axios from "axios";
// import { UTCTimestamp } from "lightweight-charts";
// import { useEffect, useRef, useState } from "react";
// import io, { Socket } from "socket.io-client";

// export interface Candle {
//   time: UTCTimestamp;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume?: number;
// }
// const SOCKET_URL = "http://localhost:3001";
// const API_URL = "http://localhost:3001";

// export function useChartSocket(tradingPair: string, interval: string) {
//   const [candles, setCandles] = useState<Candle[]>([]);
//   // --- 1. Add a new state to track if we are loading historical data ---
//   const [isLoading, setIsLoading] = useState(true);
//   const socketRef = useRef<Socket | null>(null);
//   const latestRequestRef = useRef(0);
//   const messageQueueRef = useRef<Candle[]>([]);

//   useEffect(() => {
//     if (!tradingPair || !interval) return;

//     // --- 2. Set loading to true at the start of every new fetch ---
//     setIsLoading(true);
//     const requestId = ++latestRequestRef.current;
//     messageQueueRef.current = [];
//     setCandles([]);

//     const fetchInitialData = async () => {
//       try {
//         const response = await axios.get<Candle[]>(
//           `${API_URL}/charts/${tradingPair}/candles?interval=${interval}`
//         );
        
//         if (requestId === latestRequestRef.current) {
//           const historicalData = response.data.map(c => ({...c, time: c.time as UTCTimestamp}));

//           // --- FINAL FIX: Process the queue atomically with the historical data ---
//           const queue = messageQueueRef.current;
          
//           setCandles(currentCandles => {
//             // Start with the historical data as the base
//             let updatedCandles = historicalData;

//             // Apply any queued updates that arrived during the fetch
//             if (queue.length > 0) {
//               console.log(`Processing ${queue.length} queued messages...`);
//               queue.forEach(update => {
//                 if (updatedCandles.length > 0 && updatedCandles[updatedCandles.length - 1].time === update.time) {
//                   updatedCandles[updatedCandles.length - 1] = update;
//                 } else if (updatedCandles.length === 0 || updatedCandles[updatedCandles.length - 1].time < update.time) {
//                   updatedCandles.push(update);
//                 }
//               });
//             }
//             return updatedCandles;
//           });
          
//           setIsLoading(false);
//         }
//       } catch (error) {
//         if (requestId === latestRequestRef.current) {
//           console.error(
//             `Failed to fetch initial candle data for ${tradingPair}:`,
//             error
//           );
//           setIsLoading(false); // Also set to false on error
//         }
//       }
//     };
//     fetchInitialData();

//     const socket = io(SOCKET_URL, {
//       transports: ["websocket"],
//       autoConnect: false,
//     });
//     socketRef.current = socket;

//     const handleConnect = () => {
//       console.log(
//         `[ChartSocket] Connected: ${socket.id}. Subscribing to ${tradingPair}`
//       );
//       socket.emit("subscribe", { room: tradingPair });
//     };

//     const handleCandleUpdate = (updatedCandle: Candle) => {
//       // --- 3. Ignore any real-time updates while we are loading the history ---
//       const formattedCandle = {...updatedCandle, time: updatedCandle.time as UTCTimestamp };
      
//       // --- 3. If loading, queue the message. Otherwise, update state directly. ---
//       if (isLoading) {
//         messageQueueRef.current.push(formattedCandle);
//         return;
//       }
//       setCandles((prevCandles) => {
//         if (
//           prevCandles.length > 0 &&
//           prevCandles[prevCandles.length - 1].time === formattedCandle.time
//         ) {
//           const newCandles = [...prevCandles];
//           newCandles[newCandles.length - 1] = formattedCandle;
//           return newCandles;
//         } else {
//           return [...prevCandles, formattedCandle];
//         }
//       });
//     };

//     socket.on("connect", handleConnect);
//     socket.on("candle_update", handleCandleUpdate);
//     socket.connect();

//     return () => {
//       latestRequestRef.current++;
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//       }
//     };
//   }, [tradingPair, interval]);

//   return { candles };
// }


// apps/web/src/hooks/useChartSocket.ts
import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import axios from 'axios';
import { UTCTimestamp } from 'lightweight-charts';

export interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const SOCKET_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:3001';

export function useChartSocket(tradingPair: string, interval: string) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    if (!tradingPair || !interval) return;

    const requestId = ++latestRequestRef.current;
    setCandles([]);

    const fetchInitialData = async () => {
      try {
        const response = await axios.get<Candle[]>(
          `${API_URL}/charts/${tradingPair}/candles?interval=${interval}`
        );
        
        if (requestId === latestRequestRef.current) {
          const formattedData = response.data.map(c => ({...c, time: c.time as UTCTimestamp}));
          setCandles(formattedData);
        }
      } catch (error) {
        console.error(`Failed to fetch initial candle data for ${tradingPair}:`, error);
      }
    };
    fetchInitialData();
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });
    socketRef.current = socket;
    
    const handleConnect = () => {
      console.log(`[ChartSocket] Connected: ${socket.id}. Subscribing to ${tradingPair}`);
      socket.emit('subscribe', { room: tradingPair });
    };

    const handleCandleUpdate = (updatedCandle: Candle) => {
      const formattedCandle = {...updatedCandle, time: updatedCandle.time as UTCTimestamp };
      
      setCandles((prevCandles) => {
        if (prevCandles.length === 0) {
          return [formattedCandle];
        }

        const lastCandle = prevCandles[prevCandles.length - 1];

        if (formattedCandle.time > lastCandle.time) {
          return [...prevCandles, formattedCandle];
        } else if (formattedCandle.time === lastCandle.time) {
          const newCandles = [...prevCandles];
          newCandles[newCandles.length - 1] = formattedCandle;
          return newCandles;
        }

        return prevCandles;
      });
    };

    socket.on('connect', handleConnect);
    socket.on('candle_update', handleCandleUpdate);
    socket.connect();
    
    return () => {
      latestRequestRef.current++;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [tradingPair, interval]);

  return { candles };
}