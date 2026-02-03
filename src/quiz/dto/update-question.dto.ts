import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { QuestionTypeDto } from './create-question.dto';

export class UpdateQuestionDto {
  @IsOptional()
  @IsEnum(QuestionTypeDto)
  type?: QuestionTypeDto;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
