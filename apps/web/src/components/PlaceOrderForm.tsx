"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

/**
 * Props for the PlaceOrderForm component.
 */
interface PlaceOrderFormProps {
  /** Callback function to execute when an order is placed */
  onPlaceOrder: (orderData: {
    type: "BUY" | "SELL";
    price: number;
    quantity: number;
  }) => Promise<void>;
  /** Trading pair identifier (e.g., "BTC-USD") */
  tradingPair: string;
}

/**
 * PlaceOrderForm component provides a user interface for placing trading orders.
 *
 * This component handles:
 * - Form validation for price and quantity inputs
 * - Order type selection (BUY/SELL)
 * - Error handling and user feedback via toast notifications
 * - Form state management and reset on successful submission
 *
 * The component automatically extracts base and quote assets from the trading pair
 * for proper labeling of input fields.
 */
export function PlaceOrderForm({
  onPlaceOrder,
  tradingPair,
}: PlaceOrderFormProps) {
  // Extract base and quote assets from trading pair (e.g., "BTC-USD" -> "BTC", "USD")
  const [baseAsset, quoteAsset] = tradingPair.split("-");

  // Form state management
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handles form submission for both BUY and SELL orders.
   *
   * @param type - Order type (BUY or SELL)
   * @param e - Form event
   */
  const handleSubmit = async (type: "BUY" | "SELL", e: FormEvent) => {
    e.preventDefault();

    // Parse and validate input values
    const priceNum = parseFloat(price);
    const quantityNum = parseFloat(quantity);

    // Client-side validation
    if (
      isNaN(priceNum) ||
      isNaN(quantityNum) ||
      priceNum <= 0 ||
      quantityNum <= 0
    ) {
      toast.error("Please enter valid price and quantity.");
      return;
    }

    // Additional validation for reasonable values
    if (priceNum < 0.00000001 || quantityNum < 0.00000001) {
      toast.error("Price and quantity must be at least 0.00000001");
      return;
    }

    if (priceNum > 999999999 || quantityNum > 999999999) {
      toast.error("Price and quantity cannot exceed 999,999,999");
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute the order placement
      await onPlaceOrder({ type, price: priceNum, quantity: quantityNum });

      // Show success message
      toast.success(`${type} order placed successfully!`);

      // Clear form on successful submission
      setPrice("");
      setQuantity("");
    } catch (error: unknown) {
      // Handle and display errors
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
        {/* Price Input */}
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Price ({quoteAsset})
          </label>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Quantity Input */}
        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Quantity ({baseAsset})
          </label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Order Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="submit"
            onClick={(e) => handleSubmit("BUY", e)}
            disabled={isSubmitting || !price || !quantity}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Placing..." : "Buy"}
          </button>
          <button
            type="submit"
            onClick={(e) => handleSubmit("SELL", e)}
            disabled={isSubmitting || !price || !quantity}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Placing..." : "Sell"}
          </button>
        </div>
      </form>
    </div>
  );
}
