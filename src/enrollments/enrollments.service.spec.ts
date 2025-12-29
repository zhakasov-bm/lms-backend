import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from './enrollments.service';
import { DatabaseService } from 'src/database/database.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        {
          provide: DatabaseService,
          useValue: {
            user: { findUnique: jest.fn(), upsert: jest.fn() },
            enrollment: { upsert: jest.fn() },
            course: { findUnique: jest.fn() },
            // Add other mocks as needed
          },
        },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws NotFoundException when user does not exist', async () => {
    const db = module.get<DatabaseService>(DatabaseService);
    jest.spyOn(db.course, 'findUnique').mockResolvedValue({ id: 123 });
    jest.spyOn(db.user, 'findUnique').mockResolvedValue(null);

    await expect(
      service.assign(
        { userId: 99, courseId: 123 },
        { userId: 1, role: Role.MANAGER },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('enrolls an existing user into a course', async () => {
    const db = module.get<DatabaseService>(DatabaseService);
    const userId = 99;
    const courseId = 123;
    const now = new Date('2025-01-01T00:00:00.000Z');

    jest.spyOn(db.course, 'findUnique').mockResolvedValue({ id: courseId });
    jest.spyOn(db.user, 'findUnique').mockResolvedValue({
      id: userId,
      phone: '+10000000000',
      role: Role.STUDENT,
      isVerified: true,
    });
    jest.spyOn(db.enrollment, 'upsert').mockResolvedValue({
      id: 1,
      userId,
      courseId,
      isActive: true,
      expiresAt: null,
      managerId: 1,
      createdAt: now,
    });

    const result = await service.assign(
      { userId, courseId },
      { userId: 1, role: Role.MANAGER },
    );

    expect(result.enrollment.userId).toBe(userId);
    expect(result.enrollment.courseId).toBe(courseId);
  });

  it('throws BadRequestException for invalid phone format', async () => {
    const db = module.get<DatabaseService>(DatabaseService);
    jest.spyOn(db.course, 'findUnique').mockResolvedValue({ id: 123 });

    await expect(
      service.assign(
        { phone: '12345', courseId: 123 },
        { userId: 1, role: Role.MANAGER },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
