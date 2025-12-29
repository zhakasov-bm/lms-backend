import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from 'src/database/database.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DatabaseService,
          useValue: {
            // mock methods as needed
            user: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should return "Hello Bekzhan!"', () => {
    expect(appController.getHello()).toBe('Hello Bekzhan!');
  });
});