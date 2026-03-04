import { Body, Controller, Logger, Post } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';

import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    this.logger.log(`POST /auth/login — email=${body.email}`);
    return this.authService.login(body.email, body.password);
  }
}

