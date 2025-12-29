import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt, createHmac } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { OtpPurpose } from '@prisma/client';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  private normalizePhone(phone: string) {
    return phone.trim();
  }

  private normalizeFullName(fullName?: string) {
    const v = fullName?.trim();
    return v && v.length > 0 ? v : undefined;
  }

  private generateOtpCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private hashOtp(phone: string, purpose: OtpPurpose, code: string): string {
    const secret = process.env.OTP_SECRET || 'dev-otp-secret';
    return createHmac('sha256', secret)
      .update(`${phone}:${purpose}:${code}`)
      .digest('hex');
  }

  async requestOtp(dto: RequestOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const purpose = dto.purpose;
    const fullName = this.normalizeFullName(dto.fullName);

    // REGISTER: fullName міндетті
    if (purpose === OtpPurpose.REGISTER && !fullName) {
      throw new BadRequestException('fullName is required for registration');
    }

    const ttlSeconds = Number(process.env.OTP_TTL_SECONDS ?? 300);
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new BadRequestException('Invalid OTP_TTL_SECONDS');
    }

    // Қаласаң: REGISTER кезінде “user бар ма?” тексеріп, бірден stop қылуға болады
    if (purpose === OtpPurpose.REGISTER) {
      const existing = await this.databaseService.user.findUnique({
        where: { phone },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('User already registered. Use login.');
      }
    }

    const code = this.generateOtpCode();
    const codeHash = this.hashOtp(phone, purpose, code);

    // тек осы phone+purpose үшін ескі OTP-ларды тазалаймыз
    await this.databaseService.otpCode.deleteMany({
      where: { phone, purpose },
    });

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.databaseService.otpCode.create({
      data: {
        phone,
        purpose,
        codeHash,
        expiresAt,
        pendingFullName: purpose === OtpPurpose.REGISTER ? fullName : null,
      },
    });

    // eslint-disable-next-line no-console
    console.log(
      `[DEV OTP] purpose=${purpose} phone=${phone} code=${code} expiresAt=${expiresAt.toISOString()}`,
    );

    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    return isProd ? { ok: true } : { ok: true, devCode: code };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const purpose = dto.purpose;

    const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);
    const now = new Date();

    const otp = await this.databaseService.otpCode.findFirst({
      where: { phone, purpose, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    if (maxAttempts > 0 && otp.attempts >= maxAttempts) {
      await this.databaseService.otpCode.deleteMany({ where: { phone, purpose } });
      throw new UnauthorizedException('Too many attempts. Request a new code.');
    }

    const actualHash = this.hashOtp(phone, purpose, dto.code);
    if (actualHash !== otp.codeHash) {
      await this.databaseService.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid code');
    }

    // OTP дұрыс: осы phone+purpose OTP-ларын өшіреміз
    await this.databaseService.otpCode.deleteMany({ where: { phone, purpose } });

    if (purpose === OtpPurpose.REGISTER) {
      // user бар болса — тіркеуге болмайды
      const exists = await this.databaseService.user.findUnique({
        where: { phone },
        select: { id: true },
      });
      if (exists) {
        throw new ConflictException('User already registered. Use login.');
      }

      const fullName = this.normalizeFullName(otp.pendingFullName || undefined);
      if (!fullName) {
        throw new BadRequestException('Missing fullName for registration session');
      }

      const user = await this.databaseService.user.create({
        data: { phone, isVerified: true, fullName },
      });

      const accessToken = await this.jwt.signAsync({
        sub: user.id,
        role: user.role,
        phone: user.phone,
      });

      return {
        ok: true,
        accessToken,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          fullName: user.fullName,
        },
      };
    }

    // LOGIN
    const user = await this.databaseService.user.findUnique({
      where: { phone },
    });
    if (!user) {
      throw new BadRequestException('Not registered. Please sign up.');
    }

    // optional: verify flag-ты жаңарту
    if (!user.isVerified) {
      await this.databaseService.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      phone: user.phone,
    });

    return {
      ok: true,
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        isVerified: true,
        fullName: user.fullName,
      },
    };
  }
}