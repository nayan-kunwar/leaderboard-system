import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardRepository } from './leaderboard.repository';
import { LeaderboardConsumer } from './leaderboard.consumer';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeaderboardRepository, LeaderboardConsumer],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
