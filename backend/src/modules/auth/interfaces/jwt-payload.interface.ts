import { Role } from '@prisma/client';

/**
 * The data we embed inside every JWT access token.
 * Keep this minimal — the token is sent on every request.
 * Never embed sensitive data (passwords, secrets) in a JWT.
 */
export interface JwtPayload {
  sub: string;   // subject — the user's ID (industry standard claim name)
  email: string;
  role: Role;
}