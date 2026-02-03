import { Body, Controller, Get, Post, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { AssignEnrollmentDto } from './dto/assign-enrollment.dto';
import { RemoveEnrollmentDto } from './dto/remove-enrollment.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { Role } from '@prisma/client';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  // Sales/Admin: assign
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @Post('assign')
  assign(@Body() dto: AssignEnrollmentDto, @CurrentUser() user: any) {
    return this.enrollments.assign(dto, user);
  }

  // Sales/Admin: remove
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @Post('remove')
  remove(@Body() dto: RemoveEnrollmentDto, @CurrentUser() user: any) {
    return this.enrollments.remove(dto, user);
  }

  // Student: my enrollments
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN, Role.TEACHER, Role.MANAGER) // өзіне бәрі көре алады
  @Get('my')
  my(@CurrentUser() user: any) {
    return this.enrollments.my(user.userId);
  }

  // Admin/Manager: enrollments by user
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('user/:userId')
  byUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.enrollments.byUser(userId);
  }
}
