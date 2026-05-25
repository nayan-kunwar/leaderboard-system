import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LeaderboardRepository } from './leaderboard.repository';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { KafkaService } from '../../shared/kafka/kafka.service';
import { LeaderboardGateway } from '../realtime/leaderboard.gateway';
import { LeaderboardEntryDto } from './dto';

const KAFKA_TOPIC = 'leaderboard.score.updated';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly leaderboardRepo: LeaderboardRepository,
    private readonly prismaService: PrismaService,
    private readonly kafkaService: KafkaService,
    private readonly leaderboardGateway: LeaderboardGateway,
  ) { }

  /**
   * Increment a user's score.
   * Flow: Update Redis → Publish Kafka event (async persistence).
   */
  async updateScore(
    userId: string,
    score: number,
  ): Promise<LeaderboardEntryDto> {
    // 1. Update Redis (real-time ranking)
    const newScore = await this.leaderboardRepo.incrementScore(userId, score);

    // 2. Get updated rank
    const rankData = await this.leaderboardRepo.getUserRank(userId);

    // 3. Publish event to Kafka for async persistence
    await this.kafkaService.publish(KAFKA_TOPIC, {
      type: 'score.updated',
      userId,
      delta: score,
      newScore,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Score updated: ${userId} → ${newScore} (rank #${rankData?.rank})`,
    );

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const result = new LeaderboardEntryDto({
      userId,
      username: user?.username,
      score: newScore,
      rank: rankData?.rank ?? 0,
    });

    // 4. Broadcast via WebSocket to all connected clients
    this.leaderboardGateway.broadcastScoreUpdate(result);
    const topUsers = await this.getTopUsers(10);
    this.leaderboardGateway.broadcastLeaderboardUpdate(topUsers);

    return result;
  }

  /**
   * Get the top N users on the leaderboard.
   */
  private async attachUsernames(
    entries: Array<{ userId: string; score: number; rank: number }>,
  ): Promise<LeaderboardEntryDto[]> {
    if (!entries.length) {
      return [];
    }

    const userIds = entries.map((entry) => entry.userId);
    const users = await this.prismaService.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
      },
    });

    const usernameMap = new Map(users.map((user) => [user.id, user.username]));

    return entries.map((entry) =>
      new LeaderboardEntryDto({
        userId: entry.userId,
        username: usernameMap.get(entry.userId),
        score: entry.score,
        rank: entry.rank,
      }),
    );
  }

  async getTopUsers(limit: number = 10): Promise<LeaderboardEntryDto[]> {
    const entries = await this.leaderboardRepo.getTopUsers(limit);

    const leaderboardEntries = entries.map((entry, index) => ({
      userId: entry.userId,
      score: entry.score,
      rank: index,
    }));

    return this.attachUsernames(leaderboardEntries);
  }

  /**
   * Get a specific user's rank and score.
   */
  async getUserRank(userId: string): Promise<LeaderboardEntryDto> {
    const data = await this.leaderboardRepo.getUserRank(userId);

    if (!data) {
      throw new NotFoundException(
        `User "${userId}" not found on the leaderboard`,
      );
    }

    const users = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    return new LeaderboardEntryDto({
      userId,
      username: users?.username,
      score: data.score,
      rank: data.rank,
    });
  }

  /**
   * Get users around a specific user's rank (neighborhood view).
   */
  async getUsersAroundRank(
    userId: string,
    range: number = 5,
  ): Promise<LeaderboardEntryDto[]> {
    const entries = await this.leaderboardRepo.getUsersAroundRank(
      userId,
      range,
    );

    return this.attachUsernames(entries);
  }
}
