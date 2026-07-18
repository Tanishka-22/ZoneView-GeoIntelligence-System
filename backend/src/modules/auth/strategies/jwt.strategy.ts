import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * JWT Strategy — runs automatically on every protected route.
 *
 * Flow:
 * 1. Extracts JWT from Authorization: Bearer <token> header
 * 2. Verifies the signature using JWT_ACCESS_SECRET
 * 3. Calls validate() with the decoded payload
 * 4. Attaches the returned value to req.user
 *
 * If the token is missing, expired, or tampered with,
 * Passport throws UnauthorizedException automatically.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.accessSecret')!,
    });
  }

  /**
   * Called after Passport verifies the JWT signature.
   * Whatever we return here gets attached to req.user.
   * We fetch the fresh user from DB to ensure they still exist
   * and haven't been deleted or banned since the token was issued.
   */
  async validate(payload: JwtPayload) {
    console.log('JWT Payload:', payload); //added
    const user = await this.usersService.findById(payload.sub);
    console.log('User from DB:', user); //added

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Return only what controllers need — never return passwordHash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
