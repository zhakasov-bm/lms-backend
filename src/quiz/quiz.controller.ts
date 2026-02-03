import {
  Body,
  Controller,
  Delete,
  Patch,
  Post,
  Param,
  UseGuards,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { QuizService } from './quiz.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { ReorderOptionsDto } from './dto/reorder-options.dto';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // ===== Admin/Teacher =====

  //create quiz for module if missing
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Post('modules/:moduleId/quiz')
  async ensureQuiz(@Param('moduleId') moduleId: string) {
    return this.quizService.ensureQuizForModule(Number(moduleId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Post('quiz/:quizId/questions')
  async addQuestion(
    @Param('quizId') quizId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.quizService.addQuestion(Number(quizId), dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Post('questions/:questionId/options')
  async addOption(
    @Param('questionId') questionId: string,
    @Body() dto: CreateOptionDto,
  ) {
    return this.quizService.addOption(Number(questionId), dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch('questions/:questionId')
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.quizService.updateQuestion(Number(questionId), dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete('questions/:questionId')
  async deleteQuestion(@Param('questionId') questionId: string) {
    return this.quizService.deleteQuestion(Number(questionId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch('options/:optionId')
  async updateOption(
    @Param('optionId') optionId: string,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.quizService.updateOption(Number(optionId), dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Delete('options/:optionId')
  async deleteOption(@Param('optionId') optionId: string) {
    return this.quizService.deleteOption(Number(optionId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch('quiz/:quizId/questions/reorder')
  async reorderQuestions(
    @Param('quizId') quizId: string,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.quizService.reorderQuestions(Number(quizId), dto.items);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch('questions/:questionId/options/reorder')
  async reorderOptions(
    @Param('questionId') questionId: string,
    @Body() dto: ReorderOptionsDto,
  ) {
    return this.quizService.reorderOptions(Number(questionId), dto.items);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Patch('quiz/:quizId/publish')
  async setPublish(
    @Param('quizId') quizId: string,
    @Body() body: { isPublished: boolean },
  ) {
    return this.quizService.setPublish(Number(quizId), body.isPublished);
  }

  @Patch('quiz/:quizId/reorder')
  update() {
    return;
  }

  // ===== Student =====
  @UseGuards(JwtAuthGuard)
  @Get('modules/:moduleId/quiz')
  async getPublishedQuiz(@Param('moduleId') moduleId: string) {
    return this.quizService.getPublishedQuizForStudent(Number(moduleId));
  }

  // ===== Admin/Teacher =====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @Get('modules/:moduleId/quiz/admin')
  async getQuizForAdmin(@Param('moduleId') moduleId: string) {
    return this.quizService.getQuizForAdmin(Number(moduleId));
  }
  @UseGuards(JwtAuthGuard)
  @Post('quiz/:quizId/attempts/start')
  async startAttempt(@Param('quizId') quizId: string, @Req() req: any) {
    const userId = Number(req.user?.userId ?? req.user?.sub ?? req.user?.id);
    console.log('req.user=', req.user);
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Invalid user in token');
    }
    const role = req.user?.role as Role | undefined;
    return this.quizService.startAttempt(Number(quizId), userId, role);
  }
  @UseGuards(JwtAuthGuard)
  @Post('attempts/:attemptId/submit')
  async submit(
    @Param('attemptId') attemptId: string,
    @Req() req: any,
    @Body() dto: SubmitAttemptDto,
  ) {
    const userId = Number(req.user?.userId ?? req.user?.sub ?? req.user?.id);
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Invalid user in token');
    }
    return this.quizService.submitAttempt(Number(attemptId), userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('modules/:moduleId/quiz/best-score')
  async bestScore(@Param('moduleId') moduleId: string, @Req() req: any) {
    const userId = Number(req.user?.userId ?? req.user?.sub ?? req.user?.id);
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Invalid user in token');
    }
    return this.quizService.getBestScoreForModule(Number(moduleId), userId);
  }
}
