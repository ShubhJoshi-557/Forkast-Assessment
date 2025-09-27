interface Order {
  price: string;
  quantity: string; // remaining/open quantity
  filledQuantity?: string; // how much of the order has been filled
  status?: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
}

interface OrderBookProps {
  orderBook: { bids: Order[]; asks: Order[] };
  tradingPair: string;
}

function getFillPercent(order: Order) {
  const remaining = Number(order.quantity || 0);
  const filled = Number(order.filledQuantity || 0);
  const total = remaining + filled;

  if (isNaN(total) || total <= 0) return 0;

  return Math.min((filled / total) * 100, 100);
}

function getOrderStatusColor(order: Order, isAsk: boolean) {
  const fillPercent = getFillPercent(order);

  // Priority: explicit status from backend first
  if (order.status === "CANCELLED") return "bg-gray-500/20";
  if (order.status === "FILLED" || fillPercent >= 100)
    return isAsk ? "bg-red-500/30" : "bg-green-500/30";
  if (order.status === "PARTIALLY_FILLED" || fillPercent > 0)
    return isAsk ? "bg-red-500/15" : "bg-green-500/15";

  return "";
}

export function OrderBook({ orderBook, tradingPair }: OrderBookProps) {
  const [baseAsset, quoteAsset] = tradingPair.split("-");

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
      <div className="flex justify-center items-center mb-4">
        <h2 className="text-xl font-semibold">Order Book</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-grow min-h-0">
        {/* Asks (Sell Orders) */}
        <div className="flex flex-col min-h-0">
          <h3 className="text-lg font-medium text-red-400 mb-2 text-center">
            Asks
          </h3>
          <div className="flex justify-between text-xs text-gray-400 px-2">
            <span>Price ({quoteAsset})</span>
            <span>Quantity ({baseAsset})</span>
          </div>
          <ul className="flex-grow overflow-y-auto">
            {orderBook.asks.map((ask, index) => {
              const fillPercent = getFillPercent(ask);
              const statusColor = getOrderStatusColor(ask, true);
              return (
                <li
                  key={index}
                  className={`relative flex justify-between p-1 px-2 text-sm ${statusColor}`}
                >
                  {/* Background bar showing FILLED portion (right-to-left for asks) */}
                  <div
                    className="absolute top-0 right-0 h-full bg-red-500 opacity-20 pointer-events-none"
                    style={{ width: `${fillPercent}%` }}
                  />
                  <span className="text-red-500 z-10">
                    {Number(ask.price).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="z-10">
                    {/* {Number(ask.quantity).toFixed(4)} */}
                    {Number(ask.quantity).toLocaleString("en-US", {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="flex flex-col min-h-0">
          <h3 className="text-lg font-medium text-green-400 mb-2 text-center">
            Bids
          </h3>
          <div className="flex justify-between text-xs text-gray-400 px-2">
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
                  {/* Background bar showing FILLED portion (left-to-right for bids) */}
                  <div
                    className="absolute top-0 left-0 h-full bg-green-500 opacity-20 pointer-events-none"
                    style={{ width: `${fillPercent}%` }}
                  />
                  <span className="text-green-500 z-10">
                    {Number(bid.price).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="z-10">
                    {Number(bid.quantity).toLocaleString("en-US", {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}
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
