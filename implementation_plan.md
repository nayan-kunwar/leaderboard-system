# NestJS + Redis + Kafka Live Leaderboard System

Build a scalable real-time leaderboard backend with NestJS, Redis Sorted Sets, WebSocket broadcasting, PostgreSQL persistence via Prisma, and Kafka event-driven workers.

## User Review Required

> [!IMPORTANT]
> **Scope**: This plan covers **Phases 0 through 4** (project setup → Kafka event architecture). Phases 5–6 (DDD refactor, scaling/K8s) are deferred to future iterations.

> [!WARNING]
> **Docker required**: Phases 1+ require Redis, PostgreSQL, Kafka, and Zookeeper running via `docker-compose`. Ensure Docker Desktop is available.

## Open Questions

1. **Port preferences** — Default to `3000` for API, `6379` Redis, `5432` Postgres, `9092` Kafka. Any conflicts?
2. **Auth** — The plan sets up the `auth/` module folder but leaves it empty. Do you want basic JWT auth wired in during Phase 0, or defer it?
3. **Multiple leaderboards** — Should the system support multiple named leaderboards (e.g., `weekly`, `alltime`) from day 1, or start with a single global leaderboard?

---

## Proposed Changes

### Phase 0 — Project Setup

#### [NEW] NestJS project scaffold
- Run `nest new` to scaffold the project in-place (or manually create `package.json` + tsconfig if CLI unavailable).
- Choose **npm** as the package manager.

#### [NEW] Install dependencies
```bash
npm install ioredis kafkajs prisma @prisma/client zod
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install class-validator class-transformer
```

#### [NEW] Folder structure
Create the full modular folder tree:
```
src/
├── modules/
│   ├── leaderboard/    # Phase 1
│   ├── realtime/       # Phase 2
│   ├── users/          # Future
│   └── auth/           # Future
├── shared/
│   ├── redis/          # Phase 1
│   ├── kafka/          # Phase 4
│   ├── prisma/         # Phase 3
│   ├── logger/         # Future
│   └── config/         # Phase 0
└── main.ts
```

#### [NEW] docker-compose.yml
Services: Redis 7, PostgreSQL 16, Zookeeper, Kafka (Confluent images). Ports exposed on standard defaults. Persistent volumes for Postgres data.

#### [NEW] .env
Environment variables: `REDIS_HOST`, `REDIS_PORT`, `DATABASE_URL`, `KAFKA_BROKERS`.

#### [NEW] src/shared/config/config.module.ts
NestJS `ConfigModule` wrapping `@nestjs/config` for centralized env access.

---

### Phase 1 — Redis Leaderboard Core

#### [NEW] src/shared/redis/redis.module.ts
Global NestJS module exporting `RedisService`.

#### [NEW] src/shared/redis/redis.service.ts
- Creates `ioredis` client from env config.
- Exposes `getClient()` for raw access.
- `onModuleDestroy()` for clean shutdown.
- Reconnection handling via ioredis built-in retry.

#### [NEW] src/modules/leaderboard/leaderboard.module.ts
Imports `RedisModule`. Provides `LeaderboardRepository`, `LeaderboardService`, `LeaderboardController`.

#### [NEW] src/modules/leaderboard/leaderboard.repository.ts
Low-level Redis ZSET operations:
| Method | Redis Command | Purpose |
|--------|--------------|---------|
| `incrementScore(userId, delta)` | `ZINCRBY` | Add/increment score |
| `getTopUsers(limit)` | `ZREVRANGE WITHSCORES` | Top N users |
| `getUserRank(userId)` | `ZREVRANK` + `ZSCORE` | Rank + score for user |
| `getUsersAroundRank(userId, range)` | `ZREVRANK` → `ZREVRANGE` | Neighboring users |

#### [NEW] src/modules/leaderboard/leaderboard.service.ts
Business logic layer calling the repository. Formats responses into DTOs.

#### [NEW] src/modules/leaderboard/leaderboard.controller.ts
REST endpoints:
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/leaderboard/score` | Submit/increment score |
| `GET` | `/leaderboard/top?limit=10` | Get top N |
| `GET` | `/leaderboard/rank/:userId` | Get user rank & score |

#### [NEW] src/modules/leaderboard/dto/
- `update-score.dto.ts` — `{ userId: string, score: number }`
- `leaderboard-entry.dto.ts` — `{ userId: string, score: number, rank: number }`

---

### Phase 2 — WebSocket Live Updates

#### [NEW] src/modules/realtime/realtime.module.ts
Imports `LeaderboardModule` for accessing leaderboard data on connection.

#### [NEW] src/modules/realtime/leaderboard.gateway.ts
- `@WebSocketGateway({ cors: true })` with Socket.IO.
- Event: `leaderboard.updated` — emitted to all connected clients after any score change.
- Client event: `subscribe.leaderboard` — optional room-based subscription.

#### [MODIFY] src/modules/leaderboard/leaderboard.service.ts
After score updates, inject & call the gateway to broadcast `leaderboard.updated` with the refreshed top-N.

---

### Phase 3 — PostgreSQL Persistence

#### [NEW] prisma/schema.prisma
```prisma
model LeaderboardEntry {
  id        String   @id @default(uuid())
  userId    String   @unique
  score     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ScoreHistory {
  id        String   @id @default(uuid())
  userId    String
  delta     Int
  newScore  Int
  createdAt DateTime @default(now())
}
```

#### [NEW] src/shared/prisma/prisma.module.ts
Global module exporting `PrismaService`.

#### [NEW] src/shared/prisma/prisma.service.ts
Extends `PrismaClient`, implements `OnModuleInit` / `OnModuleDestroy` for lifecycle.

#### [MODIFY] src/modules/leaderboard/leaderboard.service.ts
On score update: write to Redis **and** PostgreSQL together (dual-write). This is the temporary approach before Kafka decouples them in Phase 4.

---

### Phase 4 — Kafka Event Architecture

#### [NEW] src/shared/kafka/kafka.module.ts
Global module providing `KafkaService`.

#### [NEW] src/shared/kafka/kafka.service.ts
- Uses `kafkajs` to create producer and consumer.
- `publish(topic, message)` — generic event publisher.
- `subscribe(topic, handler)` — generic event consumer.
- Handles connection lifecycle.

#### [NEW] src/modules/leaderboard/leaderboard.consumer.ts
Kafka consumer (worker) that:
- Listens on topic `leaderboard.score.updated`.
- Persists score updates to PostgreSQL via `PrismaService`.
- Replaces the dual-write from Phase 3.

#### [MODIFY] src/modules/leaderboard/leaderboard.service.ts
- Remove direct PostgreSQL writes.
- After Redis update, publish `{ type: "score.updated", userId, score }` to Kafka.
- The consumer handles persistence asynchronously.

---

## Verification Plan

### Automated Tests
After each phase, verify with these steps:

| Phase | Verification |
|-------|-------------|
| 0 | `npm run build` succeeds, `docker-compose up -d` starts all services |
| 1 | `curl POST /leaderboard/score`, `curl GET /leaderboard/top` return correct data |
| 2 | Connect via Socket.IO client, verify `leaderboard.updated` events fire on score change |
| 3 | After score update, verify row exists in PostgreSQL via Prisma Studio or psql |
| 4 | After score update, verify Kafka consumer logs persistence and DB row is created |

### Build Check
```bash
npm run build
npm run start:dev
```
Ensure no TypeScript errors and the app starts cleanly on port 3000.
