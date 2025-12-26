import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Role } from '@prisma/client';

@Injectable()
export class CourseModulesService {
  constructor(private readonly db: DatabaseService) {}

  private async ensureCourseAccess(courseId: number, userId: number, role: Role) {
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
    const ok = enr?.isActive === true && (!enr.expiresAt || enr.expiresAt > now);
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
      test: { hasTest: false }, // кейін Test қосамыз
    };
  }

  // Teacher/Admin: create (append by default)
  async create(courseId: number, dto: any, userId: number, role: Role) {
    // teacher only own course / admin ok
    await this.ensureCourseAccess(courseId, userId, role);

    const last = await this.db.courseModule.findFirst({
      where: { courseId },
      select: { order: true },
      orderBy: { order: 'desc' },
    });

    const nextOrder = dto.order ?? ((last?.order ?? 0) + 1);

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
  }

  async update(moduleId: number, dto: any, userId: number, role: Role) {
    const mod = await this.db.courseModule.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!mod) throw new NotFoundException('Module not found');

    await this.ensureCourseAccess(mod.courseId, userId, role);

    return this.db.courseModule.update({
      where: { id: moduleId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
        ...(dto.isPreview !== undefined ? { isPreview: dto.isPreview } : {}),
      },
      select: { id: true, title: true, order: true, isPreview: true },
    });
  }

  async remove(moduleId: number, userId: number, role: Role) {
    const mod = await this.db.courseModule.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!mod) throw new NotFoundException('Module not found');

    await this.ensureCourseAccess(mod.courseId, userId, role);

    await this.db.courseModule.delete({ where: { id: moduleId } });
    return { ok: true };
  }
}