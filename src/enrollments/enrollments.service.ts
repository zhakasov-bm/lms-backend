import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma, Role } from '@prisma/client';
import { AssignEnrollmentDto } from './dto/assign-enrollment.dto';
import { RemoveEnrollmentDto } from './dto/remove-enrollment.dto';

type TargetUser = Prisma.UserGetPayload<{
  select: { id: true; phone: true; role: true; isVerified: true };
}>;

@Injectable()
export class EnrollmentsService {
  constructor(private readonly db: DatabaseService) {}

  private readonly enrollmentManagers = new Set<Role>([
    Role.MANAGER,
    Role.ADMIN,
  ]);

  private parseExpiresAt(expiresAt?: string) {
    if (!expiresAt) return null;
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime()))
      throw new BadRequestException('expiresAt must be ISO-8601 date');
    return d;
  }

  async assign(
    dto: AssignEnrollmentDto,
    actor: { userId: number; role: Role },
  ) {
    // only MANAGER (sales) or ADMIN
    if (!this.enrollmentManagers.has(actor.role)) {
      throw new ForbiddenException(
        'Only sales (MANAGER) or ADMIN can assign enrollments',
      );
    }

    // check course exists
    const course = await this.db.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    let targetUser: TargetUser | null = null;

    if (dto.userId && dto.phone) {
      throw new BadRequestException('Provide only one of userId or phone');
    }
    if (!dto.userId && !dto.phone) {
      throw new BadRequestException('Provide userId or phone');
    }
    if (dto.phone && !/^\+?[1-9]\d{7,14}$/.test(dto.phone)) {
      throw new BadRequestException(
        'phone must be E.164-like, e.g. +77001234567',
      );
    }

    if (dto.userId) {
      targetUser = await this.db.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, phone: true, role: true, isVerified: true },
      });
    } else {
      // dto.phone guaranteed here
      targetUser = await this.db.user.findUnique({
        where: { phone: dto.phone! },
        select: { id: true, phone: true, role: true, isVerified: true },
      });

      if (!targetUser) {
        throw new NotFoundException(
          'User not found. Ask the student to register first. Ask the student to register first.',
        );
      }
    }

    if (!targetUser) throw new NotFoundException('User not found');

    // ensure student role (optional strictness)
    // You can allow enrolling any role, but typically enrollments are for students
    // if (targetUser.role !== Role.STUDENT) throw new BadRequestException('Target user is not a STUDENT');

    const expiresAt = this.parseExpiresAt(dto.expiresAt);

    // upsert enrollment (unique: userId + courseId)
    const enrollment = await this.db.enrollment.upsert({
      where: {
        userId_courseId: { userId: targetUser.id, courseId: dto.courseId },
      },
      update: {
        isActive: true,
        expiresAt,
        managerId: actor.userId,
      },
      create: {
        userId: targetUser.id,
        courseId: dto.courseId,
        managerId: actor.userId,
        expiresAt,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        isActive: true,
        expiresAt: true,
        managerId: true,
        createdAt: true,
      },
    });

    return { ok: true, enrollment, user: targetUser };
  }

  async remove(
    dto: RemoveEnrollmentDto,
    actor: { userId: number; role: Role },
  ) {
    if (!this.enrollmentManagers.has(actor.role)) {
      throw new ForbiddenException(
        'Only sales (MANAGER) or ADMIN can remove enrollments',
      );
    }

    // soft remove (recommended): keep history
    const existing = await this.db.enrollment.findUnique({
      where: {
        userId_courseId: { userId: dto.userId, courseId: dto.courseId },
      },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Enrollment not found');

    const updated = await this.db.enrollment.update({
      where: { id: existing.id },
      data: { isActive: false, managerId: actor.userId },
      select: {
        id: true,
        userId: true,
        courseId: true,
        isActive: true,
        expiresAt: true,
        managerId: true,
      },
    });

    return { ok: true, enrollment: updated };
  }

  // Student: view my enrollments
  my(userId: number) {
    return this.db.enrollment.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        courseId: true,
        expiresAt: true,
        createdAt: true,
        course: {
          select: { id: true, title: true, description: true, price: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin/Manager: view enrollments by user
  async byUser(userId: number) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.db.enrollment.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        courseId: true,
        expiresAt: true,
        createdAt: true,
        course: {
          select: { id: true, title: true, description: true, price: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
