import { Test, TestingModule } from '@nestjs/testing';
import { CourseModulesService } from './course-modules.service';
import { DatabaseService } from 'src/database/database.service';

describe('CourseModulesService', () => {
  let service: CourseModulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseModulesService,
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

    service = module.get<CourseModulesService>(CourseModulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
