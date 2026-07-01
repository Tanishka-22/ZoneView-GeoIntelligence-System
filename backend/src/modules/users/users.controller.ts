import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard) // applies to every route in this controller
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return {
      success: true,
      message: 'User fetched successfully',
      data: { user },
    };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.update(user.id, dto);
    const { passwordHash: _, ...safeUser } = updatedUser;

    return {
      success: true,
      message: 'Profile updated successfully',
      data: { user: safeUser },
    };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteMe(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    await this.usersService.delete(user.id);

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }
}