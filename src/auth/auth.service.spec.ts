import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from 'src/database/database.service';
import { JwtService } from '@nestjs/jwt';
import { OtpPurpose, Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DatabaseService,
          useValue: {
            user: { findUnique: jest.fn() },
            otpCode: {
              findFirst: jest.fn(),
              deleteMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates and stores an OTP when a valid phone is provided', async () => {
    const db = module.get<DatabaseService>(DatabaseService);
    jest.spyOn(db.otpCode, 'deleteMany').mockResolvedValue({ count: 0 } as any);
    const createSpy = jest
      .spyOn(db.otpCode, 'create')
      .mockResolvedValue({ id: 1 } as any);

    const result = await service.requestOtp({
      phone: '+77001234567',
      purpose: OtpPurpose.LOGIN,
    });

    expect(result.ok).toBe(true);
    expect(result.devCode).toMatch(/^\d{6}$/);
    expect(createSpy).toHaveBeenCalledTimes(1);
    const createArgs = createSpy.mock.calls[0][0];
    expect(createArgs.data.phone).toBe('+77001234567');
    expect(createArgs.data.purpose).toBe(OtpPurpose.LOGIN);
    expect(createArgs.data.codeHash).toEqual(expect.any(String));
    expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
  });

  it('verifies OTP and returns access token with user data', async () => {
    const db = module.get<DatabaseService>(DatabaseService);
    const jwt = module.get<JwtService>(JwtService);
    const phone = '+77001234567';
    const code = '123456';
    const purpose = OtpPurpose.LOGIN;
    const codeHash = (service as any).hashOtp(phone, purpose, code);

    jest.spyOn(db.otpCode, 'findFirst').mockResolvedValue({
      id: 1,
      phone,
      purpose,
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      pendingFullName: null,
    } as any);
    jest.spyOn(db.otpCode, 'deleteMany').mockResolvedValue({ count: 1 } as any);
    jest.spyOn(db.user, 'findUnique').mockResolvedValue({
      id: 7,
      phone,
      role: Role.STUDENT,
      isVerified: true,
      fullName: 'Test User',
    } as any);
    jest.spyOn(jwt, 'signAsync').mockResolvedValue('token-abc');

    const result = await service.verifyOtp({ phone, purpose, code });

    expect(result.accessToken).toBe('token-abc');
    expect(result.user).toEqual({
      id: 7,
      phone,
      role: Role.STUDENT,
      isVerified: true,
      fullName: 'Test User',
    });
  });
});
