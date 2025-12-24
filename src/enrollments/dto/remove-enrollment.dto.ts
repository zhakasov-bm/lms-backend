import { IsInt, Min } from 'class-validator';

export class RemoveEnrollmentDto {
  @IsInt()
  @Min(1)
  courseId!: number;

  @IsInt()
  @Min(1)
  userId!: number;
}
