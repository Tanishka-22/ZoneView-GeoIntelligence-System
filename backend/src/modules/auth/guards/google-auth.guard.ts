import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Initiates Google OAuth flow when applied to a route.
 * Unlike JwtAuthGuard which validates tokens,
 * this guard redirects to Google's consent screen.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}