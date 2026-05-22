import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class UpdateScoreDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @Min(1)
  score: number;
}
