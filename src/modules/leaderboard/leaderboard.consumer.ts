import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaService } from '../../shared/kafka/kafka.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EachMessagePayload } from 'kafkajs';

const TOPIC = 'leaderboard.score.updated';
const GROUP_ID = 'leaderboard-persistence-worker';

interface ScoreUpdatedEvent {
  type: string;
  userId: string;
  delta: number;
  newScore: number;
  timestamp: string;
}

@Injectable()
export class LeaderboardConsumer implements OnModuleInit {
  private readonly logger = new Logger(LeaderboardConsumer.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    await this.kafkaService.subscribe(
      TOPIC,
      GROUP_ID,
      this.handleMessage.bind(this),
    );
    this.logger.log(`Subscribed to Kafka topic: ${TOPIC}`);
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;
    const value = message.value?.toString();

    if (!value) {
      this.logger.warn('Received empty Kafka message');
      return;
    }

    try {
      const event: ScoreUpdatedEvent = JSON.parse(value);
      await this.persistScoreUpdate(event);
    } catch (error) {
      this.logger.error(
        `Failed to process Kafka message: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Persist score update to PostgreSQL.
   * Upserts the LeaderboardEntry and creates a ScoreHistory record.
   */
  private async persistScoreUpdate(event: ScoreUpdatedEvent): Promise<void> {
    const { userId, delta, newScore } = event;

    await this.prismaService.$transaction([
      // Upsert the current leaderboard entry
      this.prismaService.leaderboardEntry.upsert({
        where: { userId },
        update: { score: newScore },
        create: { userId, score: newScore },
      }),

      // Record the score history
      this.prismaService.scoreHistory.create({
        data: {
          userId,
          delta,
          newScore,
        },
      }),
    ]);

    this.logger.debug(
      `Persisted score update: ${userId} → ${newScore} (delta: ${delta})`,
    );
  }
}
