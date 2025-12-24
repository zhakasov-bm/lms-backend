import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt, createHmac } from 'crypto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  private normalizePhone(phone: string) {
    // keep simple; you can normalize more strictly later
    return phone.trim();
  }

  private generateOtpCode(): string {
    // 6 digits
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private hashOtp(phone: string, code: string): string {
    const secret = process.env.OTP_SECRET || 'dev-otp-secret';
    return createHmac('sha256', secret)
      .update(`${phone}:${code}`)
      .digest('hex');
  }

  async requestOtp(rawPhone: string) {
    const phone = this.normalizePhone(rawPhone);

    const ttlSeconds = Number(process.env.OTP_TTL_SECONDS ?? 300);
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new BadRequestException('Invalid OTP_TTL_SECONDS');
    }

    // generate + hash
    const code = this.generateOtpCode();
    const codeHash = this.hashOtp(phone, code);

    // optional: clear old OTPs for this phone (simplifies verification)
    await this.databaseService.otpCode.deleteMany({ where: { phone } });

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.databaseService.otpCode.create({
      data: { phone, codeHash, expiresAt },
    });

    // TODO: integrate SMS provider (Twilio/Firebase/etc.)
    // For now, log it:
    // IMPORTANT: never do this in production
    // eslint-disable-next-line no-console
    console.log(`[DEV OTP] phone=${phone} code=${code} expiresAt=${expiresAt.toISOString()}`);

    // return dev code only in non-production
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    return isProd ? { ok: true } : { ok: true, devCode: code };
  }

  async verifyOtp(rawPhone: string, code: string) {
    const phone = this.normalizePhone(rawPhone);

    const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);
    const now = new Date();

    const otp = await this.databaseService.otpCode.findFirst({
      where: { phone, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    if (maxAttempts > 0 && otp.attempts >= maxAttempts) {
      await this.databaseService.otpCode.deleteMany({ where: { phone } });
      throw new UnauthorizedException('Too many attempts. Request a new code.');
    }

    const expectedHash = otp.codeHash;
    const actualHash = this.hashOtp(phone, code);

    if (actualHash !== expectedHash) {
      await this.databaseService.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid code');
    }

    // code is correct: remove OTPs
    await this.databaseService.otpCode.deleteMany({ where: { phone } });

    // find/create user
    const user = await this.databaseService.user.upsert({
      where: { phone },
      update: { isVerified: true },
      create: { phone, isVerified: true },
    });

    // sign jwt (access token)
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
      },
    };
  }
}
