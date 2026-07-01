import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { GoogleAuthDto } from '../dto/google-auth.dto';

/**
 * Google OAuth Strategy.
 *
 * Flow:
 * 1. User hits GET /auth/google
 * 2. Passport redirects to Google consent screen
 * 3. User approves → Google redirects to /auth/google/callback
 * 4. Passport exchanges code for profile
 * 5. validate() receives the profile and returns GoogleAuthDto
 * 6. The returned value is attached to req.user
 * 7. Our controller then calls authService.googleLogin(req.user)
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('auth.googleClientId')!,
      clientSecret: configService.get<string>('auth.googleClientSecret')!,
      callbackURL: configService.get<string>('auth.googleCallbackUrl')!,
      scope: ['email', 'profile'],
    });
  }

  /**
   * Called after Google successfully authenticates the user.
   * We extract only what we need from the Google profile.
   *
   * @param accessToken  - Google's access token (not our JWT — we don't use this)
   * @param refreshToken - Google's refresh token (not our JWT — we don't use this)
   * @param profile      - The user's Google profile
   * @param done         - Passport callback: done(error, user)
   */
  validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): void {
    const { id, displayName, emails, photos } = profile;

    const googleUser: GoogleAuthDto = {
      googleId: id,
      email: emails[0].value,
      name: displayName,
      avatarUrl: photos?.[0]?.value ?? '',
    };

    // Passing null as first arg means no error
    done(null, googleUser);
  }
}