// "use client";

// import axios from "axios";
// import { createChart, UTCTimestamp } from "lightweight-charts";
// import { useEffect, useRef } from "react";

// interface CandlestickChartProps {
//   tradingPair: string;
// }

// const API_URL = "http://localhost:3001";

// export function CandlestickChart({ tradingPair }: CandlestickChartProps) {
//   const chartContainerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!chartContainerRef.current) return;

//     const chart = createChart(chartContainerRef.current, {
//       width: chartContainerRef.current.clientWidth,
//       height: chartContainerRef.current.clientHeight,
//       layout: {
//         background: { color: "#161a25" },
//         textColor: "rgba(255, 255, 255, 0.9)",
//       },
//       grid: {
//         vertLines: { color: "#334158" },
//         horzLines: { color: "#334158" },
//       },
//       timeScale: { timeVisible: true, secondsVisible: false },
//     });

//     // This is the correct method call
//     const candlestickSeries = chart.addCandlestickSeries({
//       upColor: "#26a69a",
//       downColor: "#ef5350",
//       borderDownColor: "#ef5350",
//       borderUpColor: "#26a69a",
//       wickDownColor: "#ef5350",
//       wickUpColor: "#26a69a",
//     });

//     // const fetchCandles = async () => {
//     //   try {
//     //     const response = await axios.get(
//     //       `${API_URL}/charts/${tradingPair}/candles`
//     //     );
//     //     if (response.data && response.data.length > 0) {
//     //       const formattedData = response.data.map((candle: any) => ({
//     //         time: candle.time as UTCTimestamp,
//     //         open: Number(candle.open),
//     //         high: Number(candle.high),
//     //         low: Number(candle.low),
//     //         close: Number(candle.close),
//     //       }));
//     //       candlestickSeries.setData(formattedData);
//     //     }
//     //   } catch (error) {
//     //     console.error("Failed to fetch candle data:", error);
//     //   }
//     // };
//     const fetchCandles = async () => {
//       try {
//         const response = await axios.get(`${API_URL}/charts/${tradingPair}/candles`);
//         if (response.data && response.data.length > 0) {
//             const formattedData = response.data.map((candle: any) => ({
//               // UPDATED: Ensure candle.time is treated as a number
//               time: Number(candle.time) as UTCTimestamp,
//               open: Number(candle.open),
//               high: Number(candle.high),
//               low: Number(candle.low),
//               close: Number(candle.close),
//             }));
//             candlestickSeries.setData(formattedData);
//         }
//       } catch (error) {
//         console.error('Failed to fetch candle data:', error);
//       }
//     };

//     fetchCandles();

//     const handleResize = () => {
//       if (chartContainerRef.current) {
//         chart.resize(
//           chartContainerRef.current.clientWidth,
//           chartContainerRef.current.clientHeight
//         );
//       }
//     };
//     window.addEventListener("resize", handleResize);

//     return () => {
//       window.removeEventListener("resize", handleResize);
//       chart.remove();
//     };
//   }, [tradingPair]);

//   return <div ref={chartContainerRef} className="w-full h-full" />;
// }
// ================================================================================================================
// "use client";

// import { useChartSocket } from "@/hooks/useChartSocket"; // <-- 1. Import our new hook
// import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";
// import { useState, useEffect, useRef } from "react";

// interface CandlestickChartProps {
//   tradingPair: string;
// }

// export function CandlestickChart({ tradingPair }: CandlestickChartProps) {
//   const chartContainerRef = useRef<HTMLDivElement>(null);
//   // Refs to store the chart and series instances
//   const chartRef = useRef<IChartApi | null>(null);
//   const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

//   // 2. Call the hook to get live candle data
//   const [interval, setInterval] = useState('1 minute');
//   const { candles } = useChartSocket(tradingPair, interval);

//   // This first useEffect handles the creation and cleanup of the chart canvas.
//   // It runs only once when the component mounts.
//   useEffect(() => {
//     if (!chartContainerRef.current) return;

//     const chart = createChart(chartContainerRef.current, {
//       width: chartContainerRef.current.clientWidth,
//       height: chartContainerRef.current.clientHeight,
//       layout: {
//         background: { color: "#161a25" },
//         textColor: "rgba(255, 255, 255, 0.9)",
//       },
//       grid: {
//         vertLines: { color: "#334158" },
//         horzLines: { color: "#334158" },
//       },
//       timeScale: { timeVisible: true, secondsVisible: false },
//     });
//     chartRef.current = chart;

//     const candlestickSeries = chart.addCandlestickSeries({
//       upColor: "#26a69a",
//       downColor: "#ef5350",
//       borderDownColor: "#ef5350",
//       borderUpColor: "#26a69a",
//       wickDownColor: "#ef5350",
//       wickUpColor: "#26a69a",
//     });
//     candlestickSeriesRef.current = candlestickSeries;

//     const handleResize = () => {
//       if (chartContainerRef.current) {
//         chart.resize(
//           chartContainerRef.current.clientWidth,
//           chartContainerRef.current.clientHeight
//         );
//       }
//     };
//     window.addEventListener("resize", handleResize);

//     // Cleanup function
//     return () => {
//       window.removeEventListener("resize", handleResize);
//       chart.remove();
//     };
//   }, []); // <-- Empty dependency array means this runs only once

//   // This second useEffect handles updating the chart with new data.
//   // It runs whenever the 'candles' array from our hook changes.
//   useEffect(() => {
//     if (candlestickSeriesRef.current && candles.length > 0) {
//       // Always use setData. The library is optimized to handle this efficiently.
//       // This avoids all state-related race conditions.
//       candlestickSeriesRef.current.setData(candles);
//     }
//   }, [candles]);

//   return (
//     <div className="flex flex-col w-full h-full">
//       {/* --- NEW: UI for selecting the interval --- */}
//       <div className="flex items-center p-2 space-x-2 bg-[#161a25] border-b border-[#334158]">
//         {['10 second', '1 minute', '1 hour', '1 day'].map((iv) => (
//           <button
//             key={iv}
//             onClick={() => setInterval(iv)}
//             className={`px-3 py-1 text-sm rounded-md ${
//               interval === iv
//                 ? 'bg-blue-600 text-white'
//                 : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
//             }`}
//           >
//             {iv.replace(' second', 's').replace(' minute', 'm').replace(' hour', 'h').replace(' day', 'd')}
//           </button>
//         ))}
//       </div>
//       <div ref={chartContainerRef} className="w-full h-full flex-grow" />
//     </div>
//   );
// }

// "use client";

// import { useChartSocket } from "@/hooks/useChartSocket";
// import { usePersistentState } from "@/hooks/usePersistentState";
// import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";
// import { useEffect, useRef } from "react";

// import { useState } from "react"; // <-- Import useState

// interface CandlestickChartProps {
//   tradingPair: string;
// }

// export function CandlestickChart({ tradingPair }: CandlestickChartProps) {
//   const chartContainerRef = useRef<HTMLDivElement>(null);
//   const chartRef = useRef<IChartApi | null>(null);
//   const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

//   // --- NEW: A state to ensure we only render on the client ---
//   const [isClient, setIsClient] = useState(false);

//   const [interval, setInterval] = usePersistentState(
//     "chart-interval",
//     "1 minute"
//   );
//   const { candles } = useChartSocket(tradingPair, interval);

//   // This effect runs once to confirm the component has mounted on the client.
//   useEffect(() => {
//     setIsClient(true);
//   }, []);

//   // useEffect for chart creation
//   useEffect(() => {
//     // Only run this logic on the client
//     if (!isClient || !chartContainerRef.current) return;

//     const chart = createChart(chartContainerRef.current, {
//       width: chartContainerRef.current.clientWidth,
//       height: chartContainerRef.current.clientHeight,
//       // --- FIX: Add the dark theme options back in ---
//       layout: {
//         background: { color: "#161a25" },
//         textColor: "rgba(255, 255, 255, 0.9)",
//       },
//       grid: {
//         vertLines: { color: "#334158" },
//         horzLines: { color: "#334158" },
//       },
//       timeScale: { timeVisible: true, secondsVisible: false },
//     });
//     chartRef.current = chart;
//     const candlestickSeries = chart.addCandlestickSeries({
//       upColor: "#26a69a",
//       downColor: "#ef5350",
//       borderDownColor: "#ef5350",
//       borderUpColor: "#26a69a",
//       wickDownColor: "#ef5350",
//       wickUpColor: "#26a69a",
//     });
//     candlestickSeriesRef.current = candlestickSeries;

//     const handleResize = () =>
//       chart.resize(
//         chartContainerRef.current!.clientWidth,
//         chartContainerRef.current!.clientHeight
//       );
//     window.addEventListener("resize", handleResize);

//     return () => {
//       window.removeEventListener("resize", handleResize);
//       if (chartRef.current) {
//         chartRef.current.remove();
//       }
//     };
//   }, [isClient]); // <-- Runs once the client has mounted

//   // useEffect for data updates
//   useEffect(() => {
//     // Only run this logic on the client
//     if (!isClient || !candlestickSeriesRef.current) return;

//     if (candles.length > 0) {
//       candlestickSeriesRef.current.setData(candles);
//     } else {
//       candlestickSeriesRef.current.setData([]);
//     }
//   }, [candles, isClient]);

//   // --- NEW: Render nothing on the server or before client has mounted ---
//   if (!isClient) {
//     return null; // or a loading spinner
//   }

//   return (
//     <div className="flex flex-col w-full h-full">
//       <div className="flex items-center p-2 space-x-2 bg-[#161a25] border-b border-[#334158]">
//         {["10 second", "1 minute", "1 hour", "1 day"].map((iv) => (
//           <button
//             key={iv}
//             onClick={() => setInterval(iv)}
//             className={`px-3 py-1 text-sm rounded-md ${
//               interval === iv
//                 ? "bg-blue-600 text-white"
//                 : "bg-gray-700 text-gray-300 hover:bg-gray-600"
//             }`}
//           >
//             {iv
//               .replace(" second", "s")
//               .replace(" minute", "m")
//               .replace(" hour", "h")
//               .replace(" day", "d")}
//           </button>
//         ))}
//       </div>
//       <div ref={chartContainerRef} className="w-full h-full flex-grow" />
//     </div>
//   );
// }


"use client";

import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { useChartSocket } from "@/hooks/useChartSocket";
import { usePersistentState } from "@/hooks/usePersistentState";

interface CandlestickChartProps {
  tradingPair: string;
}

export function CandlestickChart({ tradingPair }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const [isClient, setIsClient] = useState(false);
  const [interval, setInterval] = usePersistentState('chart-interval', '1 minute');
  const { candles } = useChartSocket(tradingPair, interval);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { 
        background: { color: "#161a25" }, 
        textColor: "rgba(255, 255, 255, 0.9)" 
      },
      grid: { 
        vertLines: { color: "#334158" }, 
        horzLines: { color: "#334158" } 
      },
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderDownColor: "#ef5350",
      borderUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      wickUpColor: "#26a69a",
    });
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => chart.resize(chartContainerRef.current!.clientWidth, chartContainerRef.current!.clientHeight);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [isClient]);

  useEffect(() => {
    if (!isClient || !candlestickSeriesRef.current) return;
    
    if (candles.length > 0) {
      candlestickSeriesRef.current.setData(candles);
    } else {
      candlestickSeriesRef.current.setData([]);
    }
  }, [candles, isClient]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center p-2 space-x-2 bg-[#161a25] border-b border-[#334158]">
        {['10 second', '1 minute', '1 hour', '1 day'].map((iv) => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            className={`px-3 py-1 text-sm rounded-md ${
              interval === iv
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {iv.replace(' second', 's').replace(' minute', 'm').replace(' hour', 'h').replace(' day', 'd')}
          </button>
        ))}
      </div>
      <div ref={chartContainerRef} className="w-full h-full flex-grow" />
    </div>
  );
}