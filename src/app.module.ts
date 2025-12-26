import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SalesController } from './sales/sales.controller';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { UsersModule } from './users/users.module';
import { CourseModulesModule } from './course-modules/course-modules.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    CoursesModule,
    EnrollmentsModule,
    UsersModule,
    CourseModulesModule
  ],
  controllers: [AppController, SalesController],
  providers: [AppService],
})
export class AppModule {}
