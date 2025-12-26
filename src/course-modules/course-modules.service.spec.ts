import { Test, TestingModule } from '@nestjs/testing';
import { CourseModulesService } from './course-modules.service';

describe('CourseModulesService', () => {
  let service: CourseModulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseModulesService],
    }).compile();

    service = module.get<CourseModulesService>(CourseModulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
