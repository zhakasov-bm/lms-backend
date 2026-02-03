import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourseModuleDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}