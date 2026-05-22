export class LeaderboardEntryDto {
  userId: string;
  score: number;
  rank: number;

  constructor(partial: Partial<LeaderboardEntryDto>) {
    Object.assign(this, partial);
  }
}
