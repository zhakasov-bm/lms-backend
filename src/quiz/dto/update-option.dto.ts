import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateOptionDto {
  @IsOptional()
  @IsString()
  text?: string;

  // admin only
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
