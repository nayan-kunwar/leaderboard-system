# User & Authentication Flow Walkthrough

I've successfully implemented the real User and Authentication flows using JWT, Passport, and Prisma!

> [!SUCCESS]
> The Leaderboard REST API is now officially secured. You can no longer artificially inflate scores by passing a random `userId` in the payload; the server now strictly derives your identity from your cryptographic JWT access token.

---

## 🏗️ What Was Added

### 1. Database Relations (`schema.prisma`)
- Created a `User` model with `email`, `username`, and `passwordHash`.
- Migrated the existing `LeaderboardEntry` and `ScoreHistory` models to have explicit Foreign Key relations to the `User` model, enforcing database-level integrity.
- Used `onDelete: Cascade` so that if a User is deleted, their scores and history are cleanly removed.

### 2. Users Module
- Added a full `UsersService` that handles `bcrypt` password hashing during registration and ensures `email` / `username` uniqueness.

### 3. Authentication Module
- Wired in `@nestjs/passport` and `@nestjs/jwt`.
- **Public Endpoints**:
  - `POST /auth/register`: Creates a new user and returns a signed JWT.
  - `POST /auth/login`: Validates email/password and returns a signed JWT.
- **Security**: The `JWT_SECRET` is now correctly loaded from your `.env` file.

### 4. Securing the Leaderboard
- The `UpdateScoreDto` no longer requires `userId`.
- Added the `@UseGuards(JwtAuthGuard)` to the `POST /leaderboard/score` endpoint. 
- The endpoint now seamlessly reads `req.user.id` from the Passport JWT strategy.

---

## 🚀 How to Test

You can now test the full flow using standard HTTP clients (like Postman or curl).

### Step 1: Register a New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"player1", "email":"player1@example.com", "passwordHash":"secretpass"}'
```
**Response**: You will receive an `access_token` and user details.

### Step 2: Login (Optional, if you didn't just register)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"player1@example.com", "password":"secretpass"}'
```

### Step 3: Update Your Score Securely

Copy the `access_token` from Step 1 or 2, and use it in the Authorization header. Notice the body only contains the `score` now!

```bash
curl -X POST http://localhost:3000/leaderboard/score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{"score": 500}'
```

---

## 🔜 Next Steps

The backend is now much closer to a production-ready state with Auth in place. The next logical paths based on your previous roadmap would be:

- **DDD Refactor (Phase 5):** Re-architecting the modules into Clean Architecture layers (Domain, Application, Infrastructure).
- **Scalability (Phase 6):** Preparing for clustering and Kubernetes deployment.
- **WebSocket Auth:** We can also add a JWT Guard to your Socket.IO gateway if you want to restrict who can listen to live updates.
