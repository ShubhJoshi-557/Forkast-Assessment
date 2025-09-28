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
git clone <repository-url>
cd forkast-trading-platform
```

### 2. Install Dependencies

```bash
# Install root dependencies
pnpm install

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

# Testing
pnpm test               # Run unit tests
pnpm test:e2e           # Run end-to-end tests
pnpm test:cov           # Run tests with coverage

# Production
pnpm build               # Build for production
pnpm start:prod          # Start production server
pnpm pm2                 # Start with PM2 cluster
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

## 🐳 Docker Deployment

### Development Environment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build API image
cd apps/api
docker build -t forkast-api .

# Build Web image
cd ../web
docker build -t forkast-web .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Monitoring & Debugging

### Logs

```bash
# API logs
cd apps/api
pnpm start:dev  # Console logs

# Docker logs
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f kafka
```

### Database

```bash
# Connect to database
docker exec -it <postgres-container> psql -U user -d orderbook

# View tables
\dt

# Check order data
SELECT * FROM "Order" LIMIT 10;
```

### Kafka

```bash
# List topics
docker exec -it <kafka-container> kafka-topics --bootstrap-server localhost:9092 --list

# Consume messages
docker exec -it <kafka-container> kafka-console-consumer --bootstrap-server localhost:9092 --topic orders.new --from-beginning
```

## 🧪 Testing

### Unit Tests

```bash
cd apps/api
pnpm test
```

### End-to-End Tests

```bash
cd apps/api
pnpm test:e2e
```

### Load Testing

```bash
# Run load tests
cd load-testing
node test.js
```

## 📈 Performance

### Optimizations

- **Database Indexes**: Optimized for matching engine queries
- **Redis Caching**: Order book and market data caching
- **Batch Processing**: Kafka message batching
- **Connection Pooling**: Database connection optimization
- **PM2 Clustering**: Multi-process API scaling

### Benchmarks

- **Order Processing**: 1000+ orders/second
- **WebSocket Latency**: <10ms for real-time updates
- **Database Queries**: Sub-millisecond for indexed lookups
- **Memory Usage**: <500MB per API instance

## 🔒 Security

- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Prisma ORM protection
- **CORS Configuration**: Proper cross-origin setup
- **Environment Variables**: Secure configuration management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Use conventional commit messages
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Database Connection Issues:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Reset database
cd apps/api
pnpm db:reset
```

**Kafka Connection Issues:**
```bash
# Check Kafka status
docker-compose logs kafka

# Restart Kafka
docker-compose restart kafka
```

**WebSocket Connection Issues:**
- Ensure API server is running on port 3001
- Check CORS configuration
- Verify WebSocket URL in frontend

### Getting Help

- Check the [Issues](https://github.com/your-repo/issues) page
- Review the [Documentation](docs/)
- Contact the development team

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

**Built with ❤️ by the Forkast Team**
