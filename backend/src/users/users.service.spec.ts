import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const user = { id: 'u1', email: 'admin@example.com', role: 'EMPLOYEE' };
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValueOnce(user);

      const result = await service.findByEmail('admin@example.com');
      expect(result).toEqual(user);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
      });
    });

    it('returns null when not found', async () => {
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findByEmail('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  describe('createEmployeeAdminIfNotExists', () => {
    it('does nothing when admin already exists', async () => {
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'u1',
        email: 'admin@example.com',
      });

      await service.createEmployeeAdminIfNotExists();
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('creates admin when not exists', async () => {
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prismaMock.user.create as jest.Mock).mockResolvedValueOnce({
        id: 'u1',
        email: 'admin@example.com',
      });

      await service.createEmployeeAdminIfNotExists();
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
      const createCall = (prismaMock.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.email).toBe('admin@example.com');
      expect(createCall.data.role).toBe('EMPLOYEE');
    });
  });
});
