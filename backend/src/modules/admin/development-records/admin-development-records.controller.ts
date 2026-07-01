import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminDevelopmentRecordsService } from './admin-development-records.service';
import { CreateDevelopmentRecordDto } from './dto/create-development-record.dto';
import { UpdateDevelopmentRecordDto } from './dto/update-development-record.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/developments')
@UseGuards(JwtAuthGuard, RolesGuard) // order matters: authenticate, THEN authorize
@Roles(Role.ADMIN) // every route in this controller requires ADMIN
export class AdminDevelopmentRecordsController {
  constructor(
    private readonly adminDevelopmentRecordsService: AdminDevelopmentRecordsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDevelopmentRecordDto) {
    const record = await this.adminDevelopmentRecordsService.create(dto);

    return {
      success: true,
      message: 'Development record created successfully',
      data: { record },
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDevelopmentRecordDto) {
    const record = await this.adminDevelopmentRecordsService.update(id, dto);

    return {
      success: true,
      message: 'Development record updated successfully',
      data: { record },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    await this.adminDevelopmentRecordsService.delete(id);

    return {
      success: true,
      message: 'Development record deleted successfully',
    };
  }
}