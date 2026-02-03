import { Body, Controller, Get, Patch, Query, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // already had: /users/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return { ok: true, user };
  }

  // ✅ Admin only: list all users
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  listAll() {
    return this.users.listAll();
  }

  // ✅ Sales/Admin search users by phone or last digits
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  @Get('search')
  search(@Query('q') q: string) {
    return this.users.searchByPhone(q);
  }

  // ✅ Admin only: set role
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/role')
  setRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: Role },
  ) {
    return this.users.setRole(id, body.role);
  }
}
