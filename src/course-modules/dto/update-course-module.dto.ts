import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCourseModuleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}