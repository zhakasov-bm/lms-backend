import { Body, Controller, Get, Param, ParseIntPipe, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { CourseModulesService } from './course-modules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';

@Controller()
export class CourseModulesController {
  constructor(private readonly mods: CourseModulesService) {}

  // Public: course page -> modules list (locked)
  @Get('courses/:courseId/modules')
  async listPublic(@Param('courseId', ParseIntPipe) courseId: number) {
    const list = await this.mods.listPublic(courseId);
    return list.map(m => ({
      id: m.id,
      title: m.title,
      order: m.order,
      isLocked: !m.isPreview, // preview болмаса locked
    }));
  }

  // Protected: module detail (video + test)
  @UseGuards(JwtAuthGuard)
  @Get('modules/:moduleId')
  getModule(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @CurrentUser() user: { userId: number; role: Role },
  ) {
    return this.mods.getModuleDetail(moduleId, user.userId, user.role);
  }

  // Teacher/Admin: create module
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Post('courses/:courseId/modules')
  create(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateCourseModuleDto,
    @CurrentUser() user: { userId: number; role: Role },
  ) {
    return this.mods.create(courseId, dto, user.userId, user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Patch('modules/:moduleId')
  update(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Body() dto: UpdateCourseModuleDto,
    @CurrentUser() user: { userId: number; role: Role },
  ) {
    return this.mods.update(moduleId, dto, user.userId, user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Delete('modules/:moduleId')
  remove(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @CurrentUser() user: { userId: number; role: Role },
  ) {
    return this.mods.remove(moduleId, user.userId, user.role);
  }
}