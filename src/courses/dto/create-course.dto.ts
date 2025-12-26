import { IsInt, isNotEmpty, IsOptional, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  coverImageKey!: string;

  @IsOptional()
  @IsString()
  introVideoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
}
