import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';

import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`Login failed — unknown email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      this.logger.warn(`Login failed — wrong password for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(email: string, password: string) {
    this.logger.log(`Login attempt: email=${email}`);
    const user = await this.validateUser(email, password);
    const payload = { sub: user.id, email: user.email, role: user.role };
    const result = {
      accessToken: await this.jwtService.signAsync(payload),
    };
    this.logger.log(`Login successful: email=${email}, role=${user.role}`);
    return result;
  }
}

