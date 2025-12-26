import { Test, TestingModule } from '@nestjs/testing';
import { CourseModulesController } from './course-modules.controller';

describe('CourseModulesController', () => {
  let controller: CourseModulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseModulesController],
    }).compile();

    controller = module.get<CourseModulesController>(CourseModulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
