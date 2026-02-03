import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma, Role } from '@prisma/client';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';

@Injectable()
export class CourseModulesService {
  constructor(private readonly db: DatabaseService) {}

  private async ensureCourseAccess(
    courseId: number,
    userId: number,
    role: Role,
  ) {
    // Admin – OK
    if (role === Role.ADMIN) return;

    // Teacher – тек өз курсы
    if (role === Role.TEACHER) {
      const course = await this.db.course.findUnique({
        where: { id: courseId },
        select: { authorId: true },
      });
      if (!course) throw new NotFoundException('Course not found');
      if (course.authorId !== userId) throw new ForbiddenException('No access');
      return;
    }

    // Student/Manager – enrollment керек
    const enr = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { isActive: true, expiresAt: true },
    });

    const now = new Date();
    const ok =
      enr?.isActive === true && (!enr.expiresAt || enr.expiresAt > now);
    if (!ok) throw new ForbiddenException('No access (not enrolled)');
  }

  // Public: course modules list (title only)
  listPublic(courseId: number) {
    return this.db.courseModule.findMany({
      where: { courseId },
      select: { id: true, title: true, order: true, isPreview: true },
      orderBy: { order: 'asc' },
    });
  }

  // Protected: module detail (video)
  async getModuleDetail(moduleId: number, userId: number, role: Role) {
    const mod = await this.db.courseModule.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        title: true,
        order: true,
        videoUrl: true,
        isPreview: true,
        courseId: true,
      },
    });
    if (!mod) throw new NotFoundException('Module not found');

    // preview болса — ашық қылуға болады (қаламасаң, осы if-ті алып таста)
    if (!mod.isPreview) {
      await this.ensureCourseAccess(mod.courseId, userId, role);
    }

    return {
      id: mod.id,
      title: mod.title,
      order: mod.order,
      videoUrl: mod.videoUrl,
    };
  }

  // Teacher/Admin: create (append by default)
  async create(courseId: number, dto: any, userId: number, role: Role) {
    // teacher only own course / admin ok
    await this.ensureCourseAccess(courseId, userId, role);

    const attemptCreate = async () => {
      const last = await this.db.courseModule.findFirst({
        where: { courseId },
        select: { order: true },
        orderBy: { order: 'desc' },
      });

      const nextOrder = (last?.order ?? 0) + 1;

      return this.db.courseModule.create({
        data: {
          courseId,
          title: dto.title,
          videoUrl: dto.videoUrl ?? null,
          isPreview: dto.isPreview ?? false,
          order: nextOrder,
        },
        select: { id: true, title: true, order: true, isPreview: true },
      });
    };

    try {
      return await attemptCreate();
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // ✅ retry once
        try {
          return await attemptCreate();
        } catch (e2: unknown) {
          if (
            e2 instanceof Prisma.PrismaClientKnownRequestError &&
            e2.code === 'P2002'
          ) {
            throw new BadRequestException(
              'Module order conflict. Please retry.',
            );
          }
          throw e2;
        }
      }
      throw e;
    }
  }

  async update(
    moduleId: number,
    dto: UpdateCourseModuleDto,
    userId: number,
    role: Role,
  ) {
    const mod = await this.db.courseModule.findUnique({
      where: { id: moduleId },
      select: { courseId: true, order: true },
    });
    if (!mod) throw new NotFoundException('Module not found');

    await this.ensureCourseAccess(mod.courseId, userId, role);

    return this.db.$transaction(async (tx) => {
      let newOrder: number | undefined = undefined;

      if (dto.order !== undefined && dto.order !== mod.order) {
        // ✅ clamp to valid range (1..total)
        const total = await tx.courseModule.count({
          where: { courseId: mod.courseId },
        });
        newOrder = Math.max(1, Math.min(dto.order, total));

        // ✅ temporary unique negative order to avoid collisions
        await tx.courseModule.update({
          where: { id: moduleId },
          data: { order: -moduleId },
        });

        if (newOrder > mod.order) {
          await tx.courseModule.updateMany({
            where: {
              courseId: mod.courseId,
              order: { gt: mod.order, lte: newOrder },
            },
            data: { order: { decrement: 1 } },
          });
        } else {
          await tx.courseModule.updateMany({
            where: {
              courseId: mod.courseId,
              order: { gte: newOrder, lt: mod.order },
            },
            data: { order: { increment: 1 } },
          });
        }
      }

      return tx.courseModule.update({
        where: { id: moduleId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
          ...(dto.isPreview !== undefined ? { isPreview: dto.isPreview } : {}),
          ...(newOrder !== undefined ? { order: newOrder } : {}),
        },
        select: { id: true, title: true, order: true, isPreview: true },
      });
    });
  }

  async remove(moduleId: number, userId: number, role: Role) {
    const mod = await this.db.courseModule.findUnique({
      where: { id: moduleId },
      select: { courseId: true, order: true },
    });
    if (!mod) throw new NotFoundException('Module not found');

    await this.ensureCourseAccess(mod.courseId, userId, role);

    await this.db.$transaction(async (tx) => {
      await tx.courseModule.delete({ where: { id: moduleId } });

      // ✅ close the gap
      await tx.courseModule.updateMany({
        where: { courseId: mod.courseId, order: { gt: mod.order } },
        data: { order: { decrement: 1 } },
      });
    });

    return { ok: true };
  }
}
