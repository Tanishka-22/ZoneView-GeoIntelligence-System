import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      success: true,
      message: 'Notifications fetched successfully',
      data: { notifications },
    };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    const notification = await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });
    return {
      success: true,
      message: 'Notification marked as read',
      data: { notification },
    };
  }
}