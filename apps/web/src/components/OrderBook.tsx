import { useState } from "react";

interface Order {
  price: string;
  quantity: string;
  filledQuantity?: string; // optional, how much of the order has been filled
  status?: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED"; // order status
}

interface OrderBookProps {
  orderBook: { bids: Order[]; asks: Order[] };
  tradingPair: string; // Add this new prop
}

function getFillPercent(order: Order) {
  const total = Number(order.quantity);
  const filled = Number(order.filledQuantity || 0);
  return total > 0 ? Math.min((filled / total) * 100, 100) : 0;
}

function getOrderStatusColor(order: Order, isAsk: boolean) {
  // Handle missing or invalid data
  if (
    !order ||
    typeof order.quantity !== "string" ||
    typeof order.filledQuantity !== "string"
  ) {
    return "";
  }

  const total = Number(order.quantity) + Number(order.filledQuantity || 0);
  const filled = Number(order.quantity);

  // Handle invalid numbers
  if (isNaN(total) || isNaN(filled) || total < 0 || filled < 0) {
    return "";
  }

  const fillPercent = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  console.log(total, filled, fillPercent);

  // Priority: Status first, then fill percentage
  if (order.status === "CANCELLED") {
    return "bg-gray-500/20";
  }

  if (order.status === "FILLED" || fillPercent >= 100) {
    return isAsk ? "bg-red-500/30" : "bg-green-500/30";
  }

  if (order.status === "PARTIALLY_FILLED" || fillPercent > 0) {
    return isAsk ? "bg-red-500/15" : "bg-green-500/15";
  }

  return "";
}
export function OrderBook({ orderBook, tradingPair }: OrderBookProps) {
  const [baseAsset, quoteAsset] = tradingPair.split("-");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force refresh by reloading the page or triggering a re-fetch
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing orderbook:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  console.log(orderBook);
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Order Book</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-grow min-h-0">
        {/* Asks (Sells) Column */}

        {/* UPDATED: Add min-h-0 to this flex column */}

        <div className="flex flex-col min-h-0">
          <h3 className="text-lg font-medium text-red-400 mb-2 text-center">
            Asks
          </h3>

          <div className="flex justify-between text-xs text-gray-400 px-2">
            {/* Make labels dynamic */}

            <span>Price ({quoteAsset})</span>

            <span>Quantity ({baseAsset})</span>
          </div>

          <ul className="flex-grow overflow-y-auto">
            {orderBook.asks.map((ask, index) => {
              const fillPercent = getFillPercent(ask);
              // alert(fillPercent);
              const statusColor = getOrderStatusColor(ask, true);
              return (
                <li
                  key={index}
                  className={`relative flex justify-between p-1 px-2 text-sm ${statusColor}`}
                >
                  {/* Background bar from right to left for fill visualization */}
                  <div
                    className="absolute top-0 right-0 h-full bg-red-500 opacity-20 pointer-events-none"
                    style={{ width: `${100-fillPercent}%` }}
                  />

                  <span className="text-red-500 z-10">
                    {Number(ask.price).toFixed(2)}
                  </span>
                  <span className="z-10">
                    {Number(ask.quantity).toFixed(4)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bids (Buys) Column */}

        {/* UPDATED: Add min-h-0 to this flex column */}

        <div className="flex flex-col min-h-0">
          <h3 className="text-lg font-medium text-green-400 mb-2 text-center">
            Bids
          </h3>

          <div className="flex justify-between text-xs text-gray-400 px-2">
            {/* Make labels dynamic */}

            <span>Price ({quoteAsset})</span>

            <span>Quantity ({baseAsset})</span>
          </div>

          <ul className="flex-grow overflow-y-auto">
            {orderBook.bids.map((bid, index) => {
              const fillPercent = getFillPercent(bid);
              const statusColor = getOrderStatusColor(bid, false);
              return (
                <li
                  key={index}
                  className={`relative flex justify-between p-1 px-2 text-sm ${statusColor}`}
                >
                  {/* Background bar from left to right for fill visualization */}
                  <div
                    className="absolute top-0 left-0 h-full bg-green-500 opacity-20 pointer-events-none"
                    style={{ width: `${100 - fillPercent}%` }}
                  />

                  <span className="text-green-500 z-10">
                    {Number(bid.price).toFixed(2)}
                  </span>
                  <span className="z-10">
                    {Number(bid.quantity).toFixed(4)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
