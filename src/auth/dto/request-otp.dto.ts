import { OtpPurpose } from '@prisma/client/edge';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone must be E.164-like format, e.g. +77001234567',
  })
  phone!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  fullName?: string;
}
