import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateOptionDto {
  @IsString()
  text!: string;

  // admin only
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}
