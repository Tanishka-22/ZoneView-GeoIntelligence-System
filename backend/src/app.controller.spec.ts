import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return a health check response', () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'ZoneView API is running');
      expect(result).toHaveProperty('timestamp');
    });
  });
});