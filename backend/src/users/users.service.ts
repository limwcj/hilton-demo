import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createEmployeeAdminIfNotExists(): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });
    if (existing) return;

    const passwordHash = await bcrypt.hash('password', 10);
    await this.prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash,
        name: 'Admin',
        role: UserRole.EMPLOYEE,
      },
    });
  }
}

