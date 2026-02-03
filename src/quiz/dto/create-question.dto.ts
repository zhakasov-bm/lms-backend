import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum QuestionTypeDto {
  SINGLE = 'SINGLE',
  MULTI = 'MULTI',
}

export class CreateQuestionDto {
  @IsEnum(QuestionTypeDto)
  type!: QuestionTypeDto;

  @IsString()
  text!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;
}
