import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Company name must be at least 2 characters long' })
  companyName: string;
}
