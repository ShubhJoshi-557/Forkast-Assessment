# Production-Grade Order Book System

This project is a high-performance, scalable order book and matching engine built with a modern, event-driven architecture.

## 🏛️ Architecture Overview

This system uses a decoupled, microservice-inspired architecture to ensure high throughput and resilience.

-   **Frontend:** A Next.js application for user interaction.
-   **API Gateway:** A NestJS service that handles fast order ingestion via a REST API.
-   **Message Broker (Kafka):** Decouples the API from the matching logic, providing a durable buffer for incoming orders.
-   **Matching Engine:** A dedicated NestJS worker that consumes orders from Kafka, executes trades, and persists results.
-   **Real-Time Updates:** A WebSocket gateway pushes live updates (trades, order book changes) to the frontend.
-   **Database (Postgres):** The source of truth for all orders and trades.
-   **Cache (Redis):** Used for high-speed access to the active order book data (a potential performance enhancement).



## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+)
-   pnpm
-   Docker & Docker Compose

### Setup & Run

1.  **Clone the repository**
    ```bash
    git clone <your-repo-url>
    cd <your-repo-name>
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Start background services** (Postgres, Kafka, Redis)
    ```bash
    docker-compose up -d
    ```

4.  **Run database migrations**
    ```bash
    cd apps/api
    pnpm prisma migrate dev
    ```

5.  **Run the applications**
    ```bash
    # In one terminal, run the backend
    cd apps/api
    pnpm start:dev

    # In a second terminal, run the frontend
    cd apps/web
    pnpm dev
    ```
-   Backend API will be available at `http://localhost:3001`
-   Frontend will be available at `http://localhost:3000`

## ⚙️ Matching Logic

The matching engine uses a standard **Price-Time Priority** algorithm:

1.  **Price Priority:** Buy orders with the highest price and sell orders with the lowest price are matched first.
2.  **Time Priority:** If multiple orders exist at the same price level, the one that was submitted earliest gets priority.

Trades are executed at the price of the resting order (the one already in the book), not the incoming (aggressive) order. All matching operations for a single incoming order are wrapped in a database transaction to ensure atomicity.

## API Endpoints

| Method | Endpoint      | Description          | Example Request Body                               |
| :----- | :------------ | :------------------- | :------------------------------------------------- |
| `POST` | `/orders`     | Places a new order   | `{ "type": "BUY", "price": 100, "quantity": 10, "userId": 1 }` |
| `GET`  | `/health`     | Health check         | N/A                                                |

*(You can add endpoints for fetching order book and trade history here as you build them)*

## ✅ Running Tests

*(Add instructions here once you've implemented your testing strategy)*

```bash
# Example: Run unit tests for the API
cd apps/api
pnpm test
```