import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
        coverImageKey: true,
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
        coverImageKey: true,
        introVideoUrl: true,
        authorId: true,
        modules: {
          select: { id: true, title: true, order: true, isPreview: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    return {
      ...course,
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        order: m.order,
        isLocked: !m.isPreview, // preview емес болса locked
      })),
    };
  }

  // Teacher/Admin: create
  create(dto: CreateCourseDto, authorId: number) {
    return this.db.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price ?? 0,
        coverImageKey: dto.coverImageKey,
        introVideoUrl: dto.introVideoUrl ?? null,
        authorId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        authorId: true,
      },
    });
  }

  // Teacher/Admin: update (teacher only own)
  async update(
    courseId: number,
    dto: UpdateCourseDto,
    userId: number,
    role: Role,
  ) {
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
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        authorId: true,
      },
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
