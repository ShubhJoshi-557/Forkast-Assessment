# Forkast Trading Platform

A high-performance, enterprise-grade cryptocurrency trading platform built with modern microservices architecture. This platform provides real-time order matching, live market data, and comprehensive trading capabilities across multiple cryptocurrency pairs.

## 🚀 Features

- **Real-time Order Matching Engine**: High-performance matching engine with Price-Time Priority algorithm
- **Multi-Market Support**: Trade across 10+ cryptocurrency pairs (BTC-USD, ETH-USD, SOL-USD, etc.)
- **Live Market Data**: Real-time order book, trade history, and candlestick charts
- **WebSocket Integration**: Instant updates for trades, order updates, and market data
- **Scalable Architecture**: Microservices with Kafka, Redis, and PostgreSQL
- **Modern UI**: Responsive React frontend with Tailwind CSS
- **Enterprise Ready**: Comprehensive logging, monitoring, and error handling

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   API Gateway   │    │ Matching Engine │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (Kafka)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌───────▼───────┐               │
         │              │   PostgreSQL  │               │
         │              │   Database    │               │
         │              └───────────────┘               │
         │                       │                       │
         │              ┌───────▼───────┐               │
         │              │     Redis     │               │
         │              │    Cache      │               │
         │              └───────────────┘               │
         │                       │                       │
         └───────────────────────▼───────────────────────┘
                        ┌─────────────────┐
                        │     Kafka       │
                        │   Event Bus     │
                        └─────────────────┘
```

### Core Components

#### 1. **API Gateway (NestJS)**
- **Orders Service**: Handles order creation and validation
- **Market Service**: Provides order book and market data
- **Charts Service**: Generates candlestick chart data
- **WebSocket Gateway**: Real-time event broadcasting
- **Cache Service**: Redis-based caching for performance

#### 2. **Matching Engine**
- **Price-Time Priority Algorithm**: Ensures fair order execution
- **Batch Processing**: Optimized for high throughput
- **Atomic Transactions**: Guarantees data consistency
- **Event Publishing**: Real-time trade and order updates

#### 3. **Data Layer**
- **PostgreSQL**: Primary database with optimized indexes
- **Redis**: Caching and session management
- **Kafka**: Event streaming and message queuing

#### 4. **Frontend (Next.js)**
- **Real-time Dashboard**: Live order book and trade history
- **Interactive Charts**: Candlestick charts with lightweight-charts
- **Order Management**: Place and track orders
- **Responsive Design**: Mobile-friendly interface

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Message Queue**: Apache Kafka
- **WebSocket**: Socket.IO
- **Validation**: Joi + Class Validator
- **Process Manager**: PM2

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **Charts**: Lightweight Charts
- **State Management**: React Query (TanStack)
- **WebSocket**: Socket.IO Client
- **Notifications**: React Hot Toast

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Message Broker**: Apache Kafka with Zookeeper
- **Package Manager**: pnpm

## 📋 Prerequisites

- **Node.js**: v18+ (recommended: v20+)
- **pnpm**: v8+ (package manager)
- **Docker**: v20+ (for infrastructure)
- **Docker Compose**: v2+ (for orchestration)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/ShubhJoshi-557/Forkast-Assessment.git
cd Forkast-Assessment
```

### 2. Install Dependencies

```bash
# Install API dependencies
cd apps/api
pnpm install

# Install Web dependencies
cd ../web
pnpm install
```

### 3. Environment Setup

Create environment files for the API:

```bash
# apps/api/.env
DATABASE_URL="postgresql://user:password@localhost:5432/orderbook"
REDIS_URL="redis://localhost:6379"
KAFKA_BROKER_URL="localhost:29092"
PORT=3001
```

### 4. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and Kafka
docker-compose up -d
```

### 5. Database Setup

```bash
cd apps/api

# Generate Prisma client
pnpm generate

# Run database migrations
pnpm db:migrate

# Seed the database
pnpm db:seed
```

### 6. Start Services

**Terminal 1 - API Server:**
```bash
cd apps/api
pnpm start:dev
```

**Terminal 2 - Web Client:**
```bash
cd apps/web
pnpm dev
```

### 7. Access the Application

- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:3001 (when available)
- **Database Studio**: `pnpm db:studio` (from apps/api)

## 🔧 Development

### Available Scripts

#### API (`apps/api/`)

```bash
# Development
pnpm start:dev          # Start with hot reload
pnpm start:debug        # Start with debugging

# Database
pnpm generate           # Generate Prisma client
pnpm db:migrate         # Run migrations
pnpm db:reset           # Reset database
pnpm db:seed            # Seed database
pnpm db:studio          # Open Prisma Studio

# Production
pnpm build               # Build for production
pnpm start:prod          # Start production server
```

#### Web (`apps/web/`)

```bash
# Development
pnpm dev                # Start development server
pnpm build              # Build for production
pnpm start              # Start production server
pnpm lint               # Run ESLint
```

### Project Structure

```
├── apps/
│   ├── api/                    # NestJS API Server
│   │   ├── src/
│   │   │   ├── orders/        # Order management
│   │   │   ├── market/        # Market data
│   │   │   ├── matching/      # Matching engine
│   │   │   ├── websocket/     # WebSocket gateway
│   │   │   ├── charts/        # Chart data
│   │   │   ├── kafka/         # Kafka integration
│   │   │   ├── redis/         # Redis integration
│   │   │   └── prisma/        # Database layer
│   │   ├── prisma/            # Database schema & migrations
│   │   └── test/              # API tests
│   └── web/                   # Next.js Web Client
│       ├── src/
│       │   ├── app/           # Next.js app router
│       │   ├── components/     # React components
│       │   └── hooks/         # Custom hooks
│       └── public/             # Static assets
├── docker-compose.yml          # Infrastructure setup
├── package.json               # Root package configuration
└── README.md                  # This file
```

## 📊 API Endpoints

### Orders

```http
POST /orders
Content-Type: application/json

{
  "tradingPair": "BTC-USD",
  "type": "BUY",
  "price": 50000.00,
  "quantity": 0.1,
  "userId": 1
}
```

### Market Data

```http
GET /market/orderbook/BTC-USD
GET /market/trades/BTC-USD
GET /charts/candlesticks/BTC-USD?interval=1h&limit=100
```

### WebSocket Events

```javascript
// Subscribe to trading pair
socket.emit('subscribe', { room: 'BTC-USD' });

// Listen for events
socket.on('new_trade', (trade) => {
  console.log('New trade:', trade);
});

socket.on('order_update', (order) => {
  console.log('Order update:', order);
});
```

## 🧪 Testing

### Load Testing

```bash
# Run load tests
cd load-testing
k6 run test.js
```



## 🎯 Roadmap

- [ ] **Advanced Order Types**: Stop-loss, take-profit orders
- [ ] **User Authentication**: JWT-based auth system
- [ ] **Portfolio Management**: User portfolio tracking
- [ ] **Advanced Charts**: Technical indicators and analysis
- [ ] **Mobile App**: React Native mobile application
- [ ] **API Rate Limiting**: Request throttling and quotas
- [ ] **Audit Logging**: Comprehensive audit trail
- [ ] **Multi-Exchange Integration**: Connect to external exchanges

---

**Built with ❤️ by the Shubh Joshi**
