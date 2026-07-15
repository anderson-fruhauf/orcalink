import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Name must be at most 255 characters long' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Company name must be at least 2 characters long' })
  @MaxLength(255, {
    message: 'Company name must be at most 255 characters long',
  })
  companyName: string;
}
