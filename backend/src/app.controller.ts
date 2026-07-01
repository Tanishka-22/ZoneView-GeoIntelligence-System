import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      success: true,
      message: 'ZoneView API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}