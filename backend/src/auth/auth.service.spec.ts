import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByEmail: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('fails when user not found', async () => {
    usersService.findByEmail.mockResolvedValueOnce(null);
    await expect(service.login('a@example.com', 'pwd')).rejects.toThrow();
  });

  it('returns access token when credentials are valid', async () => {
    const passwordHash = await bcrypt.hash('pwd', 4);
    usersService.findByEmail.mockResolvedValueOnce({
      id: 'user-1',
      email: 'a@example.com',
      passwordHash,
      role: 'EMPLOYEE',
    });

    const result = await service.login('a@example.com', 'pwd');

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'a@example.com',
      role: 'EMPLOYEE',
    });
    expect(result).toEqual({ accessToken: 'token' });
  });
});

