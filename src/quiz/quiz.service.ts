import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { AttemptStatus, Prisma, QuestionType, Role } from '@prisma/client';
import { CreateOptionDto } from './dto/create-option.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class QuizService {
  constructor(private readonly db: DatabaseService) {}

  async ensureQuizForModule(moduleId: number) {
    // ensure module exists
    const mod = await this.db.courseModule.findUnique({
      where: { id: moduleId },
    });
    if (!mod) throw new NotFoundException('Module not found');

    // upsert quiz
    const quiz = await this.db.moduleQuiz.upsert({
      where: { moduleId },
      update: {},
      create: { moduleId },
      select: { id: true, moduleId: true, title: true, isPublished: true },
    });

    return quiz;
  }

  async addQuestion(quizId: number, dto: CreateQuestionDto) {
    const quiz = await this.db.moduleQuiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const last = await this.db.quizQuestion.aggregate({
      where: { quizId },
      _max: { order: true },
    });
    const nextOrder = (last._max.order ?? 0) + 1;

    return this.db.quizQuestion.create({
      data: {
        quizId,
        type: dto.type as unknown as QuestionType,
        text: dto.text,
        points: dto.points ?? 1,
        order: nextOrder,
      },
      select: {
        id: true,
        quizId: true,
        type: true,
        text: true,
        points: true,
        order: true,
      },
    });
  }

  async addOption(questionId: number, dto: CreateOptionDto) {
    const q = await this.db.quizQuestion.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!q) throw new NotFoundException('Question not found');

    const last = await this.db.quizOption.aggregate({
      where: { questionId },
      _max: { order: true },
    });
    const nextOrder = (last._max.order ?? 0) + 1;

    return this.db.quizOption.create({
      data: {
        questionId,
        text: dto.text,
        isCorrect: dto.isCorrect ?? false,
        order: nextOrder,
      },
      select: {
        id: true,
        questionId: true,
        text: true,
        isCorrect: true,
        order: true,
      },
    });
  }

  async updateQuestion(questionId: number, dto: UpdateQuestionDto) {
    const question = await this.db.quizQuestion.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) throw new NotFoundException('Question not found');

    const data: {
      text?: string;
      type?: QuestionType;
      points?: number;
    } = {};
    if (dto.text !== undefined) data.text = dto.text;
    if (dto.type !== undefined) data.type = dto.type as unknown as QuestionType;
    if (dto.points !== undefined && dto.points !== null)
      data.points = dto.points;
    if (Object.keys(data).length === 0)
      throw new BadRequestException('No fields to update');

    return this.db.quizQuestion.update({
      where: { id: questionId },
      data,
      select: {
        id: true,
        quizId: true,
        type: true,
        text: true,
        points: true,
        order: true,
      },
    });
  }

  async deleteQuestion(questionId: number) {
    const question = await this.db.quizQuestion.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) throw new NotFoundException('Question not found');

    await this.db.quizQuestion.delete({ where: { id: questionId } });
    return { ok: true };
  }

  async updateOption(optionId: number, dto: UpdateOptionDto) {
    const option = await this.db.quizOption.findUnique({
      where: { id: optionId },
      select: { id: true },
    });
    if (!option) throw new NotFoundException('Option not found');

    const data: {
      text?: string;
      isCorrect?: boolean;
    } = {};
    if (dto.text !== undefined) data.text = dto.text;
    if (dto.isCorrect !== undefined) data.isCorrect = dto.isCorrect;
    if (Object.keys(data).length === 0)
      throw new BadRequestException('No fields to update');

    return this.db.quizOption.update({
      where: { id: optionId },
      data,
      select: {
        id: true,
        questionId: true,
        text: true,
        isCorrect: true,
        order: true,
      },
    });
  }

  async deleteOption(optionId: number) {
    const option = await this.db.quizOption.findUnique({
      where: { id: optionId },
      select: { id: true },
    });
    if (!option) throw new NotFoundException('Option not found');

    await this.db.quizOption.delete({ where: { id: optionId } });
    return { ok: true };
  }

  async reorderQuestions(
    quizId: number,
    items: { id: number; order: number }[],
  ) {
    const quiz = await this.db.moduleQuiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const existing = await this.db.quizQuestion.findMany({
      where: { quizId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((q) => q.id));
    const incomingIds = new Set(items.map((item) => item.id));

    if (existingIds.size !== incomingIds.size)
      throw new BadRequestException('Invalid reorder payload');
    for (const id of existingIds) {
      if (!incomingIds.has(id))
        throw new BadRequestException('Invalid reorder payload');
    }

    const orderValues = items.map((item) => item.order);
    const uniqueOrders = new Set(orderValues);
    if (uniqueOrders.size !== items.length)
      throw new BadRequestException('Invalid reorder payload');
    const maxOrder = Math.max(...orderValues, 0);
    if (maxOrder !== items.length || Math.min(...orderValues) !== 1)
      throw new BadRequestException('Invalid reorder payload');

    await this.db.$transaction(
      items.map((item) =>
        this.db.quizQuestion.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return { ok: true };
  }

  async reorderOptions(
    questionId: number,
    items: { id: number; order: number }[],
  ) {
    const question = await this.db.quizQuestion.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) throw new NotFoundException('Question not found');

    const existing = await this.db.quizOption.findMany({
      where: { questionId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((o) => o.id));
    const incomingIds = new Set(items.map((item) => item.id));

    if (existingIds.size !== incomingIds.size)
      throw new BadRequestException('Invalid reorder payload');
    for (const id of existingIds) {
      if (!incomingIds.has(id))
        throw new BadRequestException('Invalid reorder payload');
    }

    const orderValues = items.map((item) => item.order);
    const uniqueOrders = new Set(orderValues);
    if (uniqueOrders.size !== items.length)
      throw new BadRequestException('Invalid reorder payload');
    const maxOrder = Math.max(...orderValues, 0);
    if (maxOrder !== items.length || Math.min(...orderValues) !== 1)
      throw new BadRequestException('Invalid reorder payload');

    await this.db.$transaction(
      items.map((item) =>
        this.db.quizOption.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return { ok: true };
  }

  async setPublish(quizId: number, isPublished: boolean) {
    const quiz = await this.db.moduleQuiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    if (isPublished) {
      // minimal publish validation
      const questions = await this.db.quizQuestion.findMany({
        where: { quizId },
        include: { options: true },
        orderBy: { order: 'asc' },
      });
      if (questions.length === 0)
        throw new BadRequestException('Quiz has no questions');

      for (const q of questions) {
        if (q.options.length < 2)
          throw new BadRequestException(
            `Question #${q.order} must have at least 2 options`,
          );
        const correctCount = q.options.filter((o) => o.isCorrect).length;
        if (q.type === 'SINGLE' && correctCount !== 1) {
          throw new BadRequestException(
            `Question #${q.order} SINGLE must have exactly 1 correct option`,
          );
        }
        if (q.type === 'MULTI' && correctCount < 1) {
          throw new BadRequestException(
            `Question #${q.order} MULTI must have at least 1 correct option`,
          );
        }
      }

      return this.db.moduleQuiz.update({
        where: { id: quizId },
        data: { isPublished },
        select: { id: true, isPublished: true },
      });
    }
  }

  // Student: do NOT return isCorrect
  async getPublishedQuizForStudent(moduleId: number) {
    const quiz = await this.db.moduleQuiz.findUnique({
      where: { moduleId },
      select: {
        id: true,
        title: true,
        isPublished: true,
        timeLimitSec: true,
        attemptLimit: true,
        passingScore: true,
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            type: true,
            text: true,
            points: true,
            order: true,
            options: {
              orderBy: { order: 'asc' },
              select: { id: true, text: true, order: true }, // no isCorrect
            },
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');
    if (!quiz.isPublished) throw new NotFoundException('Quiz not published'); // hide existence

    return quiz;
  }

  async getQuizForAdmin(moduleId: number) {
    const quiz = await this.db.moduleQuiz.findUnique({
      where: { moduleId },
      select: {
        id: true,
        title: true,
        isPublished: true,
        timeLimitSec: true,
        attemptLimit: true,
        passingScore: true,
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            type: true,
            text: true,
            points: true,
            order: true,
            options: {
              orderBy: { order: 'asc' },
              select: { id: true, text: true, isCorrect: true, order: true },
            },
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    return quiz;
  }

  async startAttempt(quizId: number, userId: number, role?: Role) {
    const quiz = await this.db.moduleQuiz.findUnique({
      where: { id: quizId },
      select: { id: true, isPublished: true, attemptLimit: true },
    });
    if (!quiz || !quiz.isPublished)
      throw new NotFoundException('Quiz not found');

    const isStaff = role === Role.ADMIN || role === Role.TEACHER;
    const existing = await this.db.quizAttempt.findUnique({
      where: { quizId_userId: { quizId, userId } },
      select: { id: true, quizId: true, status: true, startedAt: true },
    });

    if (existing) {
      if (existing.status === AttemptStatus.SUBMITTED) {
        if (!isStaff) {
          throw new ForbiddenException('You already submitted this quiz');
        }
        return this.db.$transaction(async (tx) => {
          await tx.attemptAnswer.deleteMany({ where: { attemptId: existing.id } });
          return tx.quizAttempt.update({
            where: { id: existing.id },
            data: {
              status: AttemptStatus.IN_PROGRESS,
              submittedAt: null,
              score: 0,
              maxScore: 0,
              startedAt: new Date(),
            },
            select: { id: true, quizId: true, status: true, startedAt: true },
          });
        });
      }

      return existing;
    }

    if (!isStaff && quiz.attemptLimit != null && quiz.attemptLimit <= 0) {
      throw new ForbiddenException('Attempt limit reached');
    }

    // 2) Create attempt (handle race condition)
    try {
      return await this.db.quizAttempt.create({
        data: { quizId, userId },
        select: { id: true, quizId: true, status: true, startedAt: true },
      });
    } catch (e: any) {
      // If two requests hit at same time, unique constraint may trigger (P2002)
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const again = await this.db.quizAttempt.findUnique({
          where: { quizId_userId: { quizId, userId } },
          select: { id: true, quizId: true, status: true, startedAt: true },
        });
        if (again) return again;
      }
      throw e;
    }
  }

  async submitAttempt(
    attemptId: number,
    userId: number,
    dto: SubmitAttemptDto,
  ) {
    const attempt = await this.db.quizAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true, quizId: true, status: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();
    if (attempt.status === AttemptStatus.SUBMITTED) {
      throw new BadRequestException('Attempt already submitted');
    }

    // Load quiz questions + correct options for scoring
    const questions = await this.db.quizQuestion.findMany({
      where: { quizId: attempt.quizId },
      include: { options: true },
      orderBy: { order: 'asc' },
    });
    if (questions.length === 0)
      throw new BadRequestException('Quiz has no questions');

    // Normalize answers map
    const answerMap = new Map<number, number[]>();
    for (const a of dto.answers) {
      answerMap.set(a.questionId, Array.from(new Set(a.selectedOptionIds)));
    }

    // Compute score (all-or-nothing)
    let maxScore = 0;
    let score = 0;

    for (const q of questions) {
      maxScore += q.points;

      const selected = answerMap.get(q.id) ?? [];
      // validate selected options belong to question
      const optionIds = new Set(q.options.map((o) => o.id));
      for (const oid of selected) {
        if (!optionIds.has(oid))
          throw new BadRequestException('Invalid optionId for question');
      }

      const correct = q.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id)
        .sort((a, b) => a - b);
      const selSorted = [...selected].sort((a, b) => a - b);

      const isEqual =
        correct.length === selSorted.length &&
        correct.every((v, i) => v === selSorted[i]);

      if (isEqual) score += q.points;
    }

    // Persist answers + attempt in a transaction
    const result = await this.db.$transaction(async (tx) => {
      // remove previous answers if resubmitting within IN_PROGRESS (safe)
      await tx.attemptAnswer.deleteMany({ where: { attemptId } });

      for (const q of questions) {
        const selected = answerMap.get(q.id) ?? [];
        const ans = await tx.attemptAnswer.create({
          data: { attemptId, questionId: q.id },
          select: { id: true },
        });

        if (selected.length > 0) {
          await tx.attemptAnswerOption.createMany({
            data: selected.map((optionId) => ({
              answerId: ans.id,
              optionId,
            })),
          });
        }
      }

      return tx.quizAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          score,
          maxScore,
        },
        select: {
          id: true,
          status: true,
          score: true,
          maxScore: true,
          submittedAt: true,
        },
      });
    });

    return result;
  }

  async getBestScoreForModule(moduleId: number, userId: number) {
    const quiz = await this.db.moduleQuiz.findUnique({
      where: { moduleId },
      select: { id: true, isPublished: true },
    });
    if (!quiz || !quiz.isPublished)
      throw new NotFoundException('Quiz not found');

    const best = await this.db.quizAttempt.aggregate({
      where: { quizId: quiz.id, userId, status: AttemptStatus.SUBMITTED },
      _max: { score: true },
    });

    return { bestScore: best._max.score ?? 0 };
  }
}
