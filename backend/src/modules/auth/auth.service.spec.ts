// Mock bcrypt module before imports so Jest intercepts it
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$mockedhashvalue'),
  compare: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AppException } from '../../common/exceptions/app.exception';
import { HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Unit tests for AuthService.
 * All dependencies are mocked — we test AuthService logic in isolation.
 */
describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let subscriptionsService: jest.Mocked<SubscriptionsService>;

  // A mock user that matches our Prisma User shape
  const mockUser = {
    id: 'user-123',
    email: 'tanishka@example.com',
    name: 'Tanishka',
    passwordHash: '$2b$10$hashedpassword',
    googleId: null,
    avatarUrl: null,
    role: 'USER' as const,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create mock implementations for every dependency
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      updateGoogleId: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'auth.accessSecret': 'test-access-secret',
          'auth.refreshSecret': 'test-refresh-secret',
          'auth.accessExpiresIn': '15m',
          'auth.refreshExpiresIn': '7d',
        };
        return config[key];
      }),
    };

    const mockSubscriptionsService = {
      assignFreePlan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    subscriptionsService = module.get(SubscriptionsService);
  });

  // ─── register ──────────────────────────────────────────────

  describe('register', () => {
    it('should create a user and assign a Free plan', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      subscriptionsService.assignFreePlan.mockResolvedValue({} as any);

      const result = await authService.register({
        email: 'tanishka@example.com',
        password: 'password123',
        name: 'Tanishka',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('tanishka@example.com');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'tanishka@example.com' }),
      );
      expect(subscriptionsService.assignFreePlan).toHaveBeenCalledWith(mockUser.id);

      // passwordHash must never be returned
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('tanishka@example.com');
    });

    it('should throw CONFLICT if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'tanishka@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error: { code: 'EMAIL_ALREADY_EXISTS' },
        }),
        status: HttpStatus.CONFLICT,
      });

      expect(usersService.create).not.toHaveBeenCalled();
    });

    // it('should hash the password before storing', async () => {
    //   usersService.findByEmail.mockResolvedValue(null);
    //   usersService.create.mockResolvedValue(mockUser);
    //   subscriptionsService.assignFreePlan.mockResolvedValue({} as any);

    //   await authService.register({
    //     email: 'test@example.com',
    //     password: 'plaintext123',
    //   });

    //   const createCall = usersService.create.mock.calls[0][0];

    //   // The password passed to create must be a bcrypt hash, not plain text
    //   expect(createCall.password).not.toBe('plaintext123');
    //   expect(createCall.password).toMatch(/^\$2b\$10\$/);

    //   // Verify the hash actually matches the original password
    //   const isValid = await bcrypt.compare('plaintext123', createCall.password!);
    //   expect(isValid).toBe(true);
    // });
    it('should hash the password before storing', async () => {
  usersService.findByEmail.mockResolvedValue(null);
  usersService.create.mockResolvedValue(mockUser);
  subscriptionsService.assignFreePlan.mockResolvedValue({} as any);

  await authService.register({
    email: 'test@example.com',
    password: 'plaintext123',
  });

  // bcrypt.hash must have been called with the plain text password
  expect(bcrypt.hash).toHaveBeenCalledWith('plaintext123', 10);

  // The password passed to create must be the mocked hash
  const createCall = usersService.create.mock.calls[0][0];
  expect(createCall.password).toBe('$2b$10$mockedhashvalue');
    });
});

  // ─── login ─────────────────────────────────────────────────

  describe('login', () => {
    it('should return user and tokens on valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      //jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.login({
        email: 'tanishka@example.com',
        password: 'password123',
      });

      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UNAUTHORIZED when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error: { code: 'INVALID_CREDENTIALS' },
        }),
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it('should throw UNAUTHORIZED on wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      //jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        authService.login({
          email: 'tanishka@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error: { code: 'INVALID_CREDENTIALS' },
        }),
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it('should use same error for wrong email and wrong password (no enumeration)', async () => {
      // Both "user not found" and "wrong password" must return INVALID_CREDENTIALS
      // Never USER_NOT_FOUND — that would leak which emails are registered
      usersService.findByEmail.mockResolvedValue(null);

      const noUserError = await authService
        .login({ email: 'x@x.com', password: 'pass' })
        .catch((e) => e);

      usersService.findByEmail.mockResolvedValue(mockUser);
      //jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const wrongPassError = await authService
        .login({ email: 'tanishka@example.com', password: 'wrong' })
        .catch((e) => e);

      expect(noUserError.response.error.code).toBe('INVALID_CREDENTIALS');
      expect(wrongPassError.response.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  // ─── generateTokens ────────────────────────────────────────

  describe('generateTokens', () => {
    it('should sign access and refresh tokens with different secrets', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const tokens = await authService.generateTokens(mockUser as any);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);

      // First call — access token with access secret
      const accessCall = jwtService.signAsync.mock.calls[0];
      expect(accessCall[1]).toMatchObject({
        secret: 'test-access-secret',
      });

      // Second call — refresh token with refresh secret
      const refreshCall = jwtService.signAsync.mock.calls[1];
      expect(refreshCall[1]).toMatchObject({
        secret: 'test-refresh-secret',
      });

      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.refreshToken).toBe('refresh-token');
    });
  });
});