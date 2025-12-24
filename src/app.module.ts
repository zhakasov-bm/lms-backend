import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersController } from './users/users.controller';
import { SalesController } from './sales/sales.controller';
import { CoursesController } from './courses/courses.controller';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    CoursesModule,
    EnrollmentsModule
  ],
  controllers: [AppController, UsersController, SalesController],
  providers: [AppService],
})
export class AppModule {}
