// "use client";

// import { useState } from "react";
// import axios from "axios";

// interface PlaceOrderFormProps {
//   tradingPair: string;
//   onOrderPlaced: () => void; // Callback to notify the parent to refetch data
// }

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// export function PlaceOrderForm({ tradingPair, onOrderPlaced }: PlaceOrderFormProps) {
//   const [price, setPrice] = useState("");
//   const [quantity, setQuantity] = useState("");
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleSubmit = async (side: "BUY" | "SELL") => {
//     if (!price || !quantity || Number(price) <= 0 || Number(quantity) <= 0) {
//       alert("Please enter a valid price and quantity.");
//       return;
//     }
//     setIsSubmitting(true);
//     try {
//       await axios.post(`${API_URL}/orders`, {
//         tradingPair,
//         price,
//         quantity,
//         type: side,
//         userId: 1, // Using a hardcoded userId for this demo
//       });
//       // Reset form and notify parent
//       setPrice("");
//       setQuantity("");
//       onOrderPlaced();
//     } catch (error) {
//       console.error("Failed to place order:", error);
//       alert("Error placing order. Please try again.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="bg-gray-800 rounded-lg p-4">
//       <h3 className="text-lg font-semibold mb-4 text-center">Place Order</h3>
//       <div className="space-y-4">
//         <div>
//           <label htmlFor="price" className="block text-sm font-medium text-gray-400">Price</label>
//           <input
//             id="price"
//             type="number"
//             value={price}
//             onChange={(e) => setPrice(e.target.value)}
//             placeholder="0.00"
//             className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 mt-1 text-white focus:ring-blue-500 focus:border-blue-500"
//           />
//         </div>
//         <div>
//           <label htmlFor="quantity" className="block text-sm font-medium text-gray-400">Quantity</label>
//           <input
//             id="quantity"
//             type="number"
//             value={quantity}
//             onChange={(e) => setQuantity(e.target.value)}
//             placeholder="0.00"
//             className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 mt-1 text-white focus:ring-blue-500 focus:border-blue-500"
//           />
//         </div>
//         <div className="grid grid-cols-2 gap-4">
//           <button
//             onClick={() => handleSubmit("BUY")}
//             disabled={isSubmitting}
//             className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-green-800 disabled:cursor-not-allowed"
//           >
//             {isSubmitting ? "Placing..." : "Buy"}
//           </button>
//           <button
//             onClick={() => handleSubmit("SELL")}
//             disabled={isSubmitting}
//             className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-red-800 disabled:cursor-not-allowed"
//           >
//             {isSubmitting ? "Placing..." : "Sell"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

interface PlaceOrderFormProps {
  onPlaceOrder: (orderData: {
    type: "BUY" | "SELL";
    price: number;
    quantity: number;
  }) => Promise<void>;
  tradingPair: string; // Add this new prop
}

export function PlaceOrderForm({
  onPlaceOrder,
  tradingPair,
}: PlaceOrderFormProps) {
  const [baseAsset, quoteAsset] = tradingPair.split("-");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (type: "BUY" | "SELL", e: FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    const quantityNum = parseFloat(quantity);

    if (
      isNaN(priceNum) ||
      isNaN(quantityNum) ||
      priceNum <= 0 ||
      quantityNum <= 0
    ) {
      toast.error("Please enter valid price and quantity.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onPlaceOrder({ type, price: priceNum, quantity: quantityNum });
      toast.success(`${type} order placed successfully!`);
      // Clear form on success
      setPrice("");
      setQuantity("");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to place order.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-xl font-semibold mb-4 text-center">Place Order</h3>
      <form className="space-y-4">
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            {/* Make label dynamic */}
            Price ({quoteAsset})
          </label>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            {/* Make label dynamic */}
            Quantity ({baseAsset})
          </label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="submit"
            onClick={(e) => handleSubmit("BUY", e)}
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
          >
            {isSubmitting ? "Placing..." : "Buy"}
          </button>
          <button
            type="submit"
            onClick={(e) => handleSubmit("SELL", e)}
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
          >
            {isSubmitting ? "Placing..." : "Sell"}
          </button>
        </div>
      </form>
    </div>
  );
}
