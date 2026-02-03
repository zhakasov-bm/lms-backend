import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubmitAnswerItemDto {
  @IsInt()
  questionId!: number;

  @IsArray()
  @IsInt({ each: true })
  selectedOptionIds!: number[];
}

export class SubmitAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerItemDto)
  answers!: SubmitAnswerItemDto[];
}
