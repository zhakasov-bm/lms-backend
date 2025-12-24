import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) {}
  

  getHello(): string {
    return 'Hello Bekzhan!';
  }

  async dbHealth() {
    // ең қарапайым query
    const result = await this.databaseService.user.count();
    return { ok: true, users: result };
  }
}
