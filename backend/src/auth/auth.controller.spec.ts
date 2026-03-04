import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns access token on successful login', async () => {
    authService.login.mockResolvedValueOnce({ accessToken: 'jwt-token' });

    const result = await controller.login({
      email: 'admin@example.com',
      password: 'password',
    } as any);

    expect(authService.login).toHaveBeenCalledWith('admin@example.com', 'password');
    expect(result).toEqual({ accessToken: 'jwt-token' });
  });

  it('propagates UnauthorizedException from service', async () => {
    authService.login.mockRejectedValueOnce(
      new UnauthorizedException('Invalid credentials'),
    );

    await expect(
      controller.login({
        email: 'bad@example.com',
        password: 'wrong',
      } as any),
    ).rejects.toThrow(UnauthorizedException);
  });
});
