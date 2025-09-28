"use client";

import { useChartSocket } from "@/hooks/useChartSocket";
import { usePersistentState } from "@/hooks/usePersistentState";
import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

interface CandlestickChartProps {
  tradingPair: string;
}

export function CandlestickChart({ tradingPair }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [isClient, setIsClient] = useState(false);
  const [interval, setInterval] = usePersistentState(
    "chart-interval",
    "1 minute"
  );
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
        textColor: "rgba(255, 255, 255, 0.9)",
      },
      grid: {
        vertLines: { color: "#334158" },
        horzLines: { color: "#334158" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date((time as number) * 1000);
          return date.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
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

    const handleResize = () =>
      chart.resize(
        chartContainerRef.current!.clientWidth,
        chartContainerRef.current!.clientHeight
      );
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
        {["10 second", "1 minute", "1 hour", "1 day"].map((iv) => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            className={`px-3 py-1 text-sm rounded-md ${
              interval === iv
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {iv
              .replace(" second", "s")
              .replace(" minute", "m")
              .replace(" hour", "h")
              .replace(" day", "d")}
          </button>
        ))}
      </div>
      <div ref={chartContainerRef} className="w-full h-full flex-grow" />
    </div>
  );
}
