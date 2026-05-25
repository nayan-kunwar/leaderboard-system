import { IsNumber, Min } from 'class-validator';

export class UpdateScoreDto {
  @IsNumber()
  @Min(1)
  score: number;
}
