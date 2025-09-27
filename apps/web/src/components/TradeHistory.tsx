interface Trade {
  id: string;
  price: string;
  quantity: string;
  createdAt: string;
}

interface TradeHistoryProps {
  trades: Trade[];
  tradingPair: string; // Add this new prop
}

function getPriceDirectionColor(trades: Trade[], currentIndex: number): string {
  if (currentIndex === 0 || !trades[currentIndex] || !trades[currentIndex - 1]) {
    return "text-gray-400";
  }

  const currentPrice = Number(trades[currentIndex].price);
  const previousPrice = Number(trades[currentIndex - 1].price);

  // Handle invalid prices
  if (isNaN(currentPrice) || isNaN(previousPrice)) {
    return "text-gray-400";
  }

  if (currentPrice > previousPrice) {
    return "text-green-400";
  } else if (currentPrice < previousPrice) {
    return "text-red-400";
  } else {
    return "text-gray-400";
  }
}

export function TradeHistory({ trades, tradingPair }: TradeHistoryProps) {
  const [baseAsset, quoteAsset] = tradingPair.split("-");
  console.log(trades);

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-2 text-center">Trade History</h2>

      <div className="flex justify-between text-xs text-gray-400 px-2 mb-2">
        {/* Make labels dynamic */}

        <span>Price ({quoteAsset})</span>

        <span>Quantity ({baseAsset})</span>

        <span>Time</span>
      </div>

      <ul className="flex-grow overflow-y-auto">
        {trades.map((trade, index) => {
          const priceColor = getPriceDirectionColor(trades, index);
          return (
            <li
              key={trade.id}
              className="flex justify-between p-1 px-2 text-sm hover:bg-gray-700"
            >
              <span className={priceColor}>
                {Number(trade.price).toFixed(2)}
              </span>

              <span>{Number(trade.quantity).toFixed(4)}</span>

              <span className="text-gray-400">
                {new Date(trade.createdAt).toLocaleTimeString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
