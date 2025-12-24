import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class AssignEnrollmentDto {
  @IsInt()
  @Min(1)
  courseId!: number;

  // 2 вариант: userId арқылы немесе phone арқылы
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'phone must be E.164-like, e.g. +77001234567' })
  phone?: string;

  // optional access end date
  @IsOptional()
  expiresAt?: string; // ISO string
}
