import { IsString, MinLength } from 'class-validator';

export class SearchUserDto {
  @IsString()
  @MinLength(4)
  q!: string; // phone or last digits
}