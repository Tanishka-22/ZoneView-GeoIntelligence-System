import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the authenticated user from the request.
 * Populated by JwtStrategy.validate() via JwtAuthGuard.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * @Get('me')
 * getMe(@CurrentUser() user: SafeUser) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);