import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return {
      success: true,
      message: 'Account created successfully',
      data: { user },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const { user, tokens } = await this.authService.login(dto);
    return {
      success: true,
      message: 'Login successful',
      data: { user, tokens },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    const tokens = await this.authService.refresh(refreshToken);
    return {
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens },
    };
  }

  /**
   * Protected route example — proves the JWT guard works.
   * GET /api/v1/auth/me
   * Requires: Authorization: Bearer <accessToken>
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return {
      success: true,
      message: 'User fetched successfully',
      data: { user: req.user },
    };
  }

  /**
 * Initiates Google OAuth flow.
 * GoogleAuthGuard redirects the user to Google's consent screen.
 * No request body needed — Passport handles everything.
 */
@UseGuards(GoogleAuthGuard)
@Get('google')
async googleAuth() {
  // Guard handles the redirect — this method body never executes
}

/**
 * Google OAuth callback — Google redirects here after user approves.
 * Passport has already validated the user and attached GoogleAuthDto to req.user.
 * We issue our JWT tokens and redirect to the frontend.
 */
@UseGuards(GoogleAuthGuard)
@Get('google/callback')
async googleCallback(@Request() req: any) {
  const { user, tokens } = await this.authService.googleLogin(req.user);

  // In a real frontend integration, redirect with tokens as query params
  // or set httpOnly cookies. For now, return JSON for testing.
  return {
    success: true,
    message: 'Google login successful',
    data: { user, tokens },
  };
}

}