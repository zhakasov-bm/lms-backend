import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Role } from '@prisma/client';

function maskPhone(phone: string) {
  // +77001234567 -> +7******4567
  const last4 = phone.slice(-4);
  const prefix = phone.startsWith('+') ? phone.slice(0, 2) : phone.slice(0, 1);
  return `${prefix}${'*'.repeat(Math.max(0, phone.length - prefix.length - 4))}${last4}`;
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async searchByPhone(qRaw: string) {
    const q = qRaw.trim();
    if (q.length < 4) throw new BadRequestException('Query too short (min 4 chars)');

    // 2 стратегия: exact match немесе endsWith (соңғы цифрлар)
    const users = await this.db.user.findMany({
      where: {
        OR: [
          { phone: q },
          { phone: { endsWith: q.replace(/\s/g, '') } },
        ],
      },
      select: { id: true, phone: true, role: true, isVerified: true, createdAt: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(u => ({
      id: u.id,
      phoneMasked: maskPhone(u.phone),
      role: u.role,
      isVerified: u.isVerified,
    }));
  }

  async setRole(userId: number, role: Role) {
    return this.db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, phone: true, role: true, isVerified: true },
    });
  }

  async listAll() {
    return this.db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
        fullName: true,
      },
    });
  }
}
