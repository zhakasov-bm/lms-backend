import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { Role } from '@prisma/client';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  // Public list (қысқаша)
  @Get()
  list() {
    return this.courses.listPublic();
  }

  // Public detail (қысқаша)
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.courses.getPublicById(id);
  }

  // Create course: TEACHER/ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Post()
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: { userId: number; role: Role },
  ) {
    return this.courses.create(dto, user.userId);
  }

  // Update: TEACHER/ADMIN (teacher only own)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: { userId: number; role: Role },
  ) {
    return this.courses.update(id, dto, user.userId, user.role);
  }

  // Delete: TEACHER/ADMIN (teacher only own)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: Role },
  ) {
    return this.courses.remove(id, user.userId, user.role);
  }
}
