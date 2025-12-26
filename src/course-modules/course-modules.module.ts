import { Module } from '@nestjs/common';
import { CourseModulesService } from './course-modules.service';
import { CourseModulesController } from './course-modules.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [CourseModulesService],
  controllers: [CourseModulesController]
})
export class CourseModulesModule {}
