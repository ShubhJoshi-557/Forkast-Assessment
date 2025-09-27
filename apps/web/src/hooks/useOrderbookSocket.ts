import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

/**
 * Order structure from the API.
 */
interface Order {
  price: string;
  quantity: string;
  filledQuantity?: string;
  status?: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
}

/**
 * Trade structure from the API.
 */
interface Trade {
  id: string;
  price: string;
  quantity: string;
  createdAt: string;
  tradingPair: string;
}

/**
 * Order book structure containing bids and asks.
 */
interface OrderBook {
  bids: Order[];
  asks: Order[];
}

/**
 * Return type for the useOrderbookSocket hook.
 */
interface UseOrderbookSocketReturn {
  trades: Trade[];
  orderBook: OrderBook;
  placeOrder: (orderData: {
    type: "BUY" | "SELL";
    price: number;
    quantity: number;
  }) => Promise<void>;
}

// Configuration constants
const SOCKET_URL = "http://localhost:3001";
const API_URL = "http://localhost:3001";
const MAX_TRADES_DISPLAY = 50; // Maximum number of trades to display
const DEBOUNCE_DELAY = 100; // Delay for debounced order book updates

/**
 * Custom hook for managing real-time order book and trade data via WebSocket.
 *
 * This hook provides:
 * - Real-time trade updates via WebSocket
 * - Order book data with automatic updates
 * - Order placement functionality
 * - Automatic connection management and cleanup
 * - Debounced order book updates for performance
 *
 * @param tradingPair - Trading pair identifier (e.g., "BTC-USD")
 * @returns Object containing trades, order book, and place order function
 */
export function useOrderbookSocket(
  tradingPair: string
): UseOrderbookSocketReturn {
  // State management
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook>({
    bids: [],
    asks: [],
  });

  // Refs for stable references across renders
  const socketRef = useRef<Socket | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetches the current order book data from the API.
   *
   * This function is called to get the initial order book state and
   * to refresh it when order updates are received via WebSocket.
   */
  const fetchOrderBook = useCallback(async (): Promise<void> => {
    if (!tradingPair) return;

    try {
      const response = await axios.get(
        `${API_URL}/market/${tradingPair}/orderbook`
      );
      setOrderBook(response.data);
    } catch (error) {
      console.error(`Failed to fetch order book for ${tradingPair}:`, error);
    }
  }, [tradingPair]);

  /**
   * Debounced version of fetchOrderBook to prevent excessive API calls.
   *
   * This function delays the order book fetch by DEBOUNCE_DELAY milliseconds
   * to avoid making too many API calls when multiple order updates arrive quickly.
   */
  const debouncedFetchOrderBook = useCallback((): void => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchOrderBook();
    }, DEBOUNCE_DELAY);
  }, [fetchOrderBook]);

  /**
   * Places a new trading order via the API.
   *
   * @param orderData - Order details including type, price, and quantity
   * @throws Error if order placement fails
   */
  const placeOrder = useCallback(
    async (orderData: {
      type: "BUY" | "SELL";
      price: number;
      quantity: number;
    }): Promise<void> => {
      if (!tradingPair) {
        throw new Error("Cannot place order, no market selected.");
      }

      try {
        await axios.post(`${API_URL}/orders`, {
          ...orderData,
          tradingPair,
          userId: 1, // TODO: Replace with actual user ID from authentication
        });
      } catch (error: unknown) {
        // Extract meaningful error message from API response
        let errorMessage = "An unknown error occurred";

        if (error instanceof Error) {
          if (
            "response" in error &&
            error.response &&
            typeof error.response === "object" &&
            "data" in error.response
          ) {
            const responseData = error.response.data as { message?: string };
            errorMessage = responseData.message || "An unknown error occurred";
          } else {
            errorMessage = error.message;
          }
        }

        throw new Error(errorMessage);
      }
    },
    [tradingPair]
  );

  /**
   * Main effect that manages WebSocket connection and data fetching.
   *
   * This effect:
   * - Fetches initial data when trading pair changes
   * - Establishes WebSocket connection
   * - Handles real-time updates for trades and order book
   * - Manages connection lifecycle and cleanup
   */
  useEffect(() => {
    if (!tradingPair) return;

    /**
     * Fetches initial trade and order book data.
     */
    const fetchInitialData = async (): Promise<void> => {
      try {
        const [tradesRes, orderbookRes] = await Promise.all([
          axios.get(`${API_URL}/market/${tradingPair}/trades`),
          axios.get(`${API_URL}/market/${tradingPair}/orderbook`),
        ]);

        setTrades(tradesRes.data);
        setOrderBook(orderbookRes.data);
      } catch (error) {
        console.error(
          `Failed to fetch initial data for ${tradingPair}:`,
          error
        );
      }
    };

    // Fetch initial data
    fetchInitialData();

    // Create WebSocket connection
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: false,
    });
    socketRef.current = socket;

    /**
     * Handles WebSocket connection establishment.
     */
    const handleConnect = (): void => {
      console.log(
        `WebSocket connected: ${socket.id}. Subscribing to ${tradingPair}`
      );
      socket.emit("subscribe", { room: tradingPair });
    };

    /**
     * Handles new trade events from WebSocket.
     */
    const handleNewTrade = (newTrade: Trade): void => {
      if (newTrade.tradingPair === tradingPair) {
        setTrades((prev) => [newTrade, ...prev].slice(0, MAX_TRADES_DISPLAY));
      }
    };

    /**
     * Handles order update events with debounced order book refresh.
     */
    const handleOrderUpdate = (): void => {
      // Add a small delay to ensure database updates are committed
      setTimeout(() => {
        debouncedFetchOrderBook();
      }, 100);
    };

    /**
     * Handles WebSocket errors.
     */
    const handleSocketError = (error: unknown): void => {
      console.error("WebSocket error:", error);
    };

    /**
     * Handles WebSocket disconnection.
     */
    const handleSocketDisconnect = (): void => {
      console.log("WebSocket disconnected");
    };

    // Register event listeners
    socket.on("connect", handleConnect);
    socket.on("new_trade", handleNewTrade);
    socket.on("order_update", handleOrderUpdate);
    socket.on("error", handleSocketError);
    socket.on("disconnect", handleSocketDisconnect);

    // Connect to WebSocket
    socket.connect();

    // Cleanup function
    return (): void => {
      console.log(`Cleaning up WebSocket connection for ${tradingPair}`);

      // Clear any pending debounced calls
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Disconnect WebSocket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [tradingPair, fetchOrderBook, debouncedFetchOrderBook]);

  return { trades, orderBook, placeOrder };
}
