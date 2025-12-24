import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Role } from '@prisma/client';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly db: DatabaseService) {}

  // Public: қысқаша list
  listPublic() {
    return this.db.course.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        authorId: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  // Public: қысқаша detail
  async getPublicById(courseId: number) {
    const course = await this.db.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        authorId: true,
      },
    });

    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  // Protected: толық контент (әзірге placeholder)
  async getContent(courseId: number, userId: number, role: Role) {
    // ADMIN/TEACHER өзіне болады (teacher үшін өз курсын тексереміз)
    const course = await this.db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, description: true, price: true, authorId: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (role === Role.ADMIN) {
      return { course, content: { message: 'Full content placeholder (ADMIN)' } };
    }

    if (role === Role.TEACHER) {
      if (course.authorId !== userId) {
        throw new ForbiddenException('Teacher can access content only for own courses');
      }
      return { course, content: { message: 'Full content placeholder (TEACHER)' } };
    }

    // STUDENT/MANAGER: enrollment тексеру
    const enrollment = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, isActive: true, expiresAt: true },
    });

    const now = new Date();
    const valid =
      enrollment?.isActive === true &&
      (!enrollment.expiresAt || enrollment.expiresAt > now);

    if (!valid) {
      throw new ForbiddenException('No access: not enrolled (or expired)');
    }

    return { course, content: { message: 'Full content placeholder (ENROLLED)' } };
  }

  // Teacher/Admin: create
  create(dto: CreateCourseDto, authorId: number) {
    return this.db.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price ?? 0,
        authorId,
      },
      select: { id: true, title: true, description: true, price: true, authorId: true },
    });
  }

  // Teacher/Admin: update (teacher only own)
  async update(courseId: number, dto: UpdateCourseDto, userId: number, role: Role) {
    const course = await this.db.course.findUnique({
      where: { id: courseId },
      select: { id: true, authorId: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (role !== Role.ADMIN && course.authorId !== userId) {
      throw new ForbiddenException('You can update only your own course');
    }

    return this.db.course.update({
      where: { id: courseId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
      },
      select: { id: true, title: true, description: true, price: true, authorId: true },
    });
  }

  // Teacher/Admin: delete (teacher only own)
  async remove(courseId: number, userId: number, role: Role) {
    const course = await this.db.course.findUnique({
      where: { id: courseId },
      select: { id: true, authorId: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (role !== Role.ADMIN && course.authorId !== userId) {
      throw new ForbiddenException('You can delete only your own course');
    }

    await this.db.course.delete({ where: { id: courseId } });
    return { ok: true };
  }
}
