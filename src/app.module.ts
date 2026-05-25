import { Module } from '@nestjs/common';
import { ConfigModule } from './shared/config/config.module';
import { RedisModule } from './shared/redis/redis.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { KafkaModule } from './shared/kafka/kafka.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // Shared infrastructure (global)
    ConfigModule,
    RedisModule,
    PrismaModule,
    KafkaModule,

    // Feature modules
    LeaderboardModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule { }
