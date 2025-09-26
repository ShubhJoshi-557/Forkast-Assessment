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

export function TradeHistory({ trades, tradingPair }: TradeHistoryProps) {
  const [baseAsset, quoteAsset] = tradingPair.split("-");

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
        {trades.map((trade) => (
          <li
            key={trade.id}
            className="flex justify-between p-1 px-2 text-sm hover:bg-gray-700"
          >
            <span className="text-green-500">
              {Number(trade.price).toFixed(2)}
            </span>

            <span>{Number(trade.quantity).toFixed(4)}</span>

            <span className="text-gray-400">
              {new Date(trade.createdAt).toLocaleTimeString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
