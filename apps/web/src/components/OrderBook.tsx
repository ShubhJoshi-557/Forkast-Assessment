interface Order {
  price: string;
  quantity: string;
}

interface OrderBookProps {
  orderBook: { bids: Order[]; asks: Order[] };
  tradingPair: string; // Add this new prop
}

export function OrderBook({ orderBook, tradingPair }: OrderBookProps) {
  const [baseAsset, quoteAsset] = tradingPair.split("-");

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-4 text-center">Order Book</h2>

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
            {orderBook.asks.map((ask, index) => (
              <li key={index} className="flex justify-between p-1 px-2 text-sm">
                <span className="text-red-500">
                  {Number(ask.price).toFixed(2)}
                </span>

                <span>{Number(ask.quantity).toFixed(4)}</span>
              </li>
            ))}
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
            {orderBook.bids.map((bid, index) => (
              <li key={index} className="flex justify-between p-1 px-2 text-sm">
                <span className="text-green-500">
                  {Number(bid.price).toFixed(2)}
                </span>

                <span>{Number(bid.quantity).toFixed(4)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
