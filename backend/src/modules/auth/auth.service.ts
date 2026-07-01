import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '@prisma/client';
import type { StringValue } from 'ms';
import {GoogleAuthDto} from "./dto/google-auth.dto";
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // ─── Registration ────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new AppException(
        'An account with this email already exists',
        'EMAIL_ALREADY_EXISTS',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: passwordHash,
    });

    await this.subscriptionsService.assignFreePlan(user.id); // Assign Free plan to new user

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  // ─── Login ───────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{
    user: Omit<User, 'passwordHash'>;
    tokens: AuthTokens;
  }> {
    // 1. Find user by email
    const user = await this.usersService.findByEmail(dto.email);

    // 2. Use a deliberately vague error message.
    //    Never tell the client whether the email or password was wrong —
    //    that would let attackers enumerate valid email addresses.
    if (!user || !user.passwordHash) {
      throw new AppException(
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 3. Compare submitted password against stored hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppException(
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 4. Generate token pair
    const tokens = await this.generateTokens(user);

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  // ─── Token Generation ────────────────────────────────────────

  async generateTokens(user: User): Promise<AuthTokens> {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

    const accessSecret = this.configService.get<string>('auth.accessSecret');
    const accessExpiresIn = this.configService.get<string>('auth.accessExpiresIn');
    const refreshSecret = this.configService.get<string>('auth.refreshSecret');
    const refreshExpiresIn = this.configService.get<string>('auth.refreshExpiresIn');

    if (!accessSecret || !accessExpiresIn || !refreshSecret || !refreshExpiresIn) {
      throw new AppException(
        'Missing auth configuration',
        'AUTH_CONFIG_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Access token — short-lived, used for every API request
     const accessToken = await this.jwtService.signAsync(payload, {
    secret: this.configService.get<string>('auth.accessSecret'),
    expiresIn: this.configService.get<string>('auth.accessExpiresIn') as StringValue,
  });

    // Refresh token — long-lived, used only to get a new access token.
    // Contains minimal data — just enough to identify the user.
    const refreshToken = await this.jwtService.signAsync(
    { sub: user.id },
    {
      secret: this.configService.get<string>('auth.refreshSecret'),
      expiresIn: this.configService.get<string>('auth.refreshExpiresIn') as StringValue,
    },
  );

    return { accessToken, refreshToken };
  }

  // ─── Refresh ─────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthTokens> {
    // 1. Verify the refresh token signature and expiry
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('auth.refreshSecret'),
      });
    } catch {
      throw new AppException(
        'Invalid or expired refresh token',
        'INVALID_REFRESH_TOKEN',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 2. Confirm user still exists
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new AppException(
        'User no longer exists',
        'USER_NOT_FOUND',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 3. Issue a fresh token pair
    return this.generateTokens(user);
  }
  // ─── Google OAuth ─────────────────────────────────────────────

async googleLogin(googleUser: GoogleAuthDto): Promise<{
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
}> {
  // 1. Try to find by Google ID first (returning user via Google)
  let user = await this.usersService.findByGoogleId(googleUser.googleId);

  // 2. Try to find by email (user registered with email, now using Google)
  if (!user) {
    user = await this.usersService.findByEmail(googleUser.email);

    if (user) {
      // Link Google ID to existing email account
      user = await this.usersService.updateGoogleId(user.id, googleUser.googleId);
    }
  }

  // 3. Brand new user — create account automatically
  if (!user) {
    user = await this.usersService.create({
      email: googleUser.email,
      name: googleUser.name,
      googleId: googleUser.googleId,
      avatarUrl: googleUser.avatarUrl,
    });
  }

  const tokens = await this.generateTokens(user);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, tokens };
}
}