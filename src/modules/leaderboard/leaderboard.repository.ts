import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../shared/redis/redis.service';

const LEADERBOARD_KEY = 'leaderboard:global';

@Injectable()
export class LeaderboardRepository {
  private readonly logger = new Logger(LeaderboardRepository.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Increment a user's score by a delta value using ZINCRBY.
   * Returns the new total score.
   */
  async incrementScore(userId: string, delta: number): Promise<number> {
    const client = this.redisService.getClient();
    const newScore = await client.zincrby(LEADERBOARD_KEY, delta, userId);
    this.logger.debug(`ZINCRBY ${userId} by ${delta} → ${newScore}`);
    return parseFloat(newScore);
  }

  /**
   * Get the top N users from the leaderboard using ZREVRANGE.
   * Returns array of { userId, score } ordered by rank (highest first).
   */
  async getTopUsers(
    limit: number = 10,
  ): Promise<{ userId: string; score: number }[]> {
    const client = this.redisService.getClient();
    const results = await client.zrevrange(
      LEADERBOARD_KEY,
      0,
      limit - 1,
      'WITHSCORES',
    );

    // Results come as [member1, score1, member2, score2, ...]
    const entries: { userId: string; score: number }[] = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    return entries;
  }

  /**
   * Get a specific user's rank (0-indexed, top = 0) and score.
   * Returns null if the user doesn't exist in the leaderboard.
   */
  async getUserRank(
    userId: string,
  ): Promise<{ rank: number; score: number } | null> {
    const client = this.redisService.getClient();

    const rank = await client.zrevrank(LEADERBOARD_KEY, userId);
    if (rank === null) {
      return null;
    }

    const score = await client.zscore(LEADERBOARD_KEY, userId);
    return {
      rank,
      score: parseFloat(score ?? '0'),
    };
  }

  /**
   * Get users around a specific user's rank.
   * Returns `range` users above and below the target user.
   */
  async getUsersAroundRank(
    userId: string,
    range: number = 5,
  ): Promise<{ userId: string; score: number; rank: number }[]> {
    const client = this.redisService.getClient();

    const userRank = await client.zrevrank(LEADERBOARD_KEY, userId);
    if (userRank === null) {
      return [];
    }

    const start = Math.max(0, userRank - range);
    const end = userRank + range;

    const results = await client.zrevrange(
      LEADERBOARD_KEY,
      start,
      end,
      'WITHSCORES',
    );

    const entries: { userId: string; score: number; rank: number }[] = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
        rank: start + i / 2,
      });
    }
    return entries;
  }
}
