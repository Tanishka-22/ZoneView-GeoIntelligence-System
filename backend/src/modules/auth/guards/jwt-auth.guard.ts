import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Apply this guard to any route that requires authentication.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user; // populated by JwtStrategy.validate()
 * }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}