import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Marks a route as requiring one of the specified roles.
 * Must be paired with RolesGuard to actually enforce anything —
 * this decorator only attaches metadata, it doesn't check permissions itself.
 *
 * Usage:
 * @Roles(Role.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Post()
 * create() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);