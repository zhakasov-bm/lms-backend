import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { DatabaseService } from 'src/database/database.service';

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: DatabaseService,
          useValue: {
            user: { findUnique: jest.fn(), upsert: jest.fn() },
            enrollment: { upsert: jest.fn() },
            course: { findUnique: jest.fn() },
            // Add other mocks as needed
          },
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
