// apps/web/src/hooks/useChartSocket.ts
import axios from "axios";
import { UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

export interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const SOCKET_URL = "http://localhost:3001";
const API_URL = "http://localhost:3001";

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
          const formattedData = response.data.map((c) => ({
            ...c,
            time: c.time as UTCTimestamp,
          }));
          setCandles(formattedData);
        }
      } catch (error) {
        console.error(
          `Failed to fetch initial candle data for ${tradingPair}:`,
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
        `[ChartSocket] Connected: ${socket.id}. Subscribing to ${tradingPair}`
      );
      socket.emit("subscribe", { room: tradingPair });
    };

    const handleCandleUpdate = (updatedCandle: Candle) => {
      const formattedCandle = {
        ...updatedCandle,
        time: updatedCandle.time as UTCTimestamp,
      };

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

    socket.on("connect", handleConnect);
    socket.on("candle_update", handleCandleUpdate);
    socket.connect();

    return () => {
      // Capture the current ref value to avoid stale closure
      const currentSocket = socketRef.current;

      // Increment request ID to invalidate any pending requests
      latestRequestRef.current++;

      if (currentSocket) {
        currentSocket.disconnect();
      }
    };
  }, [tradingPair, interval]);

  return { candles };
}
