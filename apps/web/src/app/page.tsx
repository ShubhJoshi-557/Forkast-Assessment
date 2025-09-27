"use client";

import { CandlestickChart } from "@/components/CandlestickChart";
import { OrderBook } from "@/components/OrderBook";
import { PlaceOrderForm } from "@/components/PlaceOrderForm";
import { TradeHistory } from "@/components/TradeHistory";
import { useOrderbookSocket } from "@/hooks/useOrderbookSocket";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

const SUPPORTED_MARKETS = [
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "BNB-USD",
  "XRP-USD",
  "ADA-USD",
  "DOGE-USD",
  "AVAX-USD",
  "MATIC-USD",
  "DOT-USD",
];
export default function Home() {
  const [selectedMarket, setSelectedMarket] = useState(SUPPORTED_MARKETS[0]);

  useEffect(() => {
    const savedMarket = localStorage.getItem("selectedMarket");
    if (savedMarket && SUPPORTED_MARKETS.includes(savedMarket)) {
      setSelectedMarket(savedMarket);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedMarket", selectedMarket);
  }, [selectedMarket]);

  const { trades, orderBook, placeOrder } = useOrderbookSocket(selectedMarket);

  return (
    <>
      <Toaster position="bottom-right" />
      <div className="flex flex-col h-screen bg-gray-900 text-white p-4 gap-4 font-mono overflow-hidden">
        {/* THIS IS THE CORRECT, COMPLETE HEADER */}
        <header className="flex justify-between items-center flex-shrink-0">
          <h1 className="text-2xl font-bold">Forkast</h1>
          <h2 className="text-lg font-bold">Shubh Joshi&apos;s Assessment</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="market-select" className="text-sm text-gray-400">
              Market:
            </label>
            <select
              id="market-select"
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-md p-2"
            >
              {SUPPORTED_MARKETS.map((market) => (
                <option key={market} value={market}>
                  {market}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow min-h-0">
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="bg-gray-800 rounded-lg p-4 flex-grow min-h-0">
              <CandlestickChart tradingPair={selectedMarket} />
            </div>
            <div className="flex-shrink-0">
              {/* Pass the prop here */}
              <PlaceOrderForm
                onPlaceOrder={placeOrder}
                tradingPair={selectedMarket}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex-1 min-h-0">
              {/* Pass the prop here */}
              <OrderBook orderBook={orderBook} tradingPair={selectedMarket} />
            </div>
            <div className="flex-1 min-h-0">
              {/* Pass the prop here */}
              <TradeHistory trades={trades} tradingPair={selectedMarket} />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
