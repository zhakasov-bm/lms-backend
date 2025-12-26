import { IsInt, IsOptional, IsString, Min, IsNotEmpty } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  coverImageKey?: string;

  @IsOptional()
  @IsString()
  introVideoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
}