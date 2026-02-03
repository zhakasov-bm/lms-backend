import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuizDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitSec?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  attemptLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  passingScore?: number;
}
