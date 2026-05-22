# Leaderboard System Walkthrough (Phases 0–4)

I've successfully implemented the foundation and core features of your NestJS + Redis + Kafka Live Leaderboard System. The codebase is now structurally prepared for massive scale.

> [!SUCCESS]
> The build completes successfully without any TypeScript or compilation errors. The Prisma 7 configuration has been fully adapted to the new driver adapter architecture.

---

## 🏗️ What We Built

We followed the step-by-step roadmap and implemented the first 5 phases:

### Phase 0: Project Setup
- **NestJS Scaffolding:** Bootstrapped a fresh project.
- **Docker Infrastructure:** Created `docker-compose.yml` with Redis 7, PostgreSQL 16, Zookeeper, and Kafka.
- **Configuration:** Setup `.env` and the NestJS `ConfigModule` for robust environment variable management.

### Phase 1: Redis Leaderboard Core
- **Redis Module:** Implemented `RedisService` using `ioredis` with automatic reconnection logic.
- **Leaderboard Repository:** Created `LeaderboardRepository` encapsulating core Redis Sorted Set (ZSET) operations:
  - `ZINCRBY` for atomic score increments.
  - `ZREVRANGE` for retrieving the top N users.
  - `ZREVRANK` and `ZSCORE` for precise user rankings.
- **REST API:** Created `LeaderboardController` with `class-validator` validated endpoints:
  - `POST /leaderboard/score`
  - `GET /leaderboard/top`
  - `GET /leaderboard/rank/:userId`
  - `GET /leaderboard/around/:userId`

### Phase 2: WebSocket Live Updates
- **Realtime Gateway:** Implemented `LeaderboardGateway` using Socket.IO.
- **Live Broadcasting:** Hooked into the score update flow to instantly broadcast individual `score.updated` and global `leaderboard.updated` events to all connected clients.

### Phase 3 & 4: Kafka Event Architecture & PostgreSQL Persistence
- **Prisma 7 Setup:** Configured `PrismaService` with `@prisma/adapter-pg` and defined the `LeaderboardEntry` and `ScoreHistory` models.
- **Kafka Service:** Created `KafkaService` using `kafkajs` for generic pub/sub capabilities.
- **Async Workers (Decoupled Persistence):** 
  - Instead of saving to the database in the main API request (Phase 3's dual-write), the `LeaderboardService` now publishes a `leaderboard.score.updated` event to Kafka.
  - The `LeaderboardConsumer` worker subscribes to this topic and performs the heavy PostgreSQL upserts asynchronously in the background.

---

## 🚀 How to Run and Test

### 1. Start the Infrastructure (Docker)

Make sure Docker Desktop is running, then spin up the services:

```bash
docker-compose up -d
```

This will start:
- Redis (Port `6379`)
- PostgreSQL (Port `5432`)
- Zookeeper (Port `2181`)
- Kafka (Port `9092`)

### 2. Apply Database Migrations

Before starting the app, push the Prisma schema to your PostgreSQL database:

```bash
npx prisma db push
```
*(Using `db push` is great for development. Use `migrate dev` later when you want to track migration files).*

### 3. Start the API Server

```bash
npm run start:dev
```

You should see logs indicating successful connections to Redis, PostgreSQL, and Kafka.

### 4. Test the Endpoints

**Add a Score:**
```bash
curl -X POST http://localhost:3000/leaderboard/score \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123", "score": 1500}'
```

**Get Top Users:**
```bash
curl http://localhost:3000/leaderboard/top?limit=10
```

> [!TIP]
> **Testing WebSockets:** You can use tools like [Postman](https://www.postman.com/) or a simple HTML file with the Socket.IO client script to connect to `ws://localhost:3000/leaderboard` and listen for `leaderboard.updated` events when you increment scores!

---

## 🔜 Next Steps

The system is currently stable and running smoothly. When you're ready, we can proceed to:
- **Phase 5 (DDD Refactor):** Splitting the leaderboard module into Domain, Application, and Infrastructure layers.
- **Phase 6 (Scalability):** Preparing the codebase for Kubernetes deployments and Redis/Kafka clustering.
- Wiring in actual User/Authentication flows using the placeholder modules we created.
