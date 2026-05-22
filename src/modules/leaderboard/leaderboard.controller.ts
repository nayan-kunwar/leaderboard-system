import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { UpdateScoreDto, LeaderboardEntryDto } from './dto';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * POST /leaderboard/score
   * Submit or increment a user's score.
   */
  @Post('score')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateScore(
    @Body() updateScoreDto: UpdateScoreDto,
  ): Promise<LeaderboardEntryDto> {
    return this.leaderboardService.updateScore(
      updateScoreDto.userId,
      updateScoreDto.score,
    );
  }

  /**
   * GET /leaderboard/top?limit=10
   * Get the top N users on the leaderboard.
   */
  @Get('top')
  async getTopUsers(
    @Query('limit') limit?: string,
  ): Promise<LeaderboardEntryDto[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.leaderboardService.getTopUsers(parsedLimit);
  }

  /**
   * GET /leaderboard/rank/:userId
   * Get a specific user's rank and score.
   */
  @Get('rank/:userId')
  async getUserRank(
    @Param('userId') userId: string,
  ): Promise<LeaderboardEntryDto> {
    return this.leaderboardService.getUserRank(userId);
  }

  /**
   * GET /leaderboard/around/:userId?range=5
   * Get users around a specific user's rank.
   */
  @Get('around/:userId')
  async getUsersAroundRank(
    @Param('userId') userId: string,
    @Query('range') range?: string,
  ): Promise<LeaderboardEntryDto[]> {
    const parsedRange = range ? parseInt(range, 10) : 5;
    return this.leaderboardService.getUsersAroundRank(userId, parsedRange);
  }
}
