import { Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.debug(`User not found: email=${email}`);
    }
    return user;
  }

  async createEmployeeAdminIfNotExists(): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });
    if (existing) {
      this.logger.log('Default admin user already exists, skipping seed');
      return;
    }

    const passwordHash = await bcrypt.hash('password', 10);
    await this.prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash,
        name: 'Admin',
        role: UserRole.EMPLOYEE,
      },
    });
    this.logger.log('Default admin user created: admin@example.com');
  }
}

