import { ArrowDown, ArrowUp } from "lucide-react";

interface Trade {
  id: string;
  price: string;
  quantity: string;
  createdAt: string;
}

interface TradeHistoryProps {
  trades: Trade[];
  tradingPair: string;
}

function getPriceDirection(
  trades: Trade[],
  currentIndex: number
): "up" | "down" | "neutral" {
  if (
    currentIndex === 0 ||
    !trades[currentIndex] ||
    !trades[currentIndex - 1]
  ) {
    return "neutral";
  }

  const currentPrice = Number(trades[currentIndex].price);
  const previousPrice = Number(trades[currentIndex - 1].price);

  if (isNaN(currentPrice) || isNaN(previousPrice)) return "neutral";

  if (currentPrice > previousPrice) return "up";
  if (currentPrice < previousPrice) return "down";
  return "neutral";
}

export function TradeHistory({ trades, tradingPair }: TradeHistoryProps) {
  const [baseAsset, quoteAsset] = tradingPair.split("-");

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-2 text-center">Trade History</h2>

      {/* Column headers */}
      <div className="grid grid-cols-3 text-xs text-gray-400 px-2 mb-2">
        <span className="text-left">Price ({quoteAsset})</span>
        <span className="text-right">Quantity ({baseAsset})</span>
        <span className="text-right">Time</span>
      </div>

      <ul className="flex-grow overflow-y-auto font-mono">
        {trades.map((trade, index) => {
          const direction = getPriceDirection(trades, index);

          let color = "text-gray-400";
          if (direction === "up") color = "text-green-400";
          if (direction === "down") color = "text-red-400";

          return (
            <li
              key={trade.id}
              className="grid grid-cols-3 items-center p-1 px-2 text-sm hover:bg-gray-700"
            >
              {/* Price with arrow */}
              <span className={`flex items-center gap-1 ${color}`}>
                {/* {Number(trade.price).toFixed(2)} */}
                {Number(trade.price).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {direction === "up" && <ArrowUp size={12} />}
                {direction === "down" && <ArrowDown size={12} />}
              </span>

              {/* Quantity aligned right */}
              <span className="text-right">
                {/* {Number(trade.quantity).toFixed(4)} */}
                {Number(trade.quantity).toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </span>

              {/* Time aligned right */}
              <span className="text-right text-gray-400">
                {new Date(trade.createdAt).toLocaleTimeString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
