import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello Bekzhan!';
  }

  getWelcome(): string {
    return 'Welcome to the Bekzhan API!';
  }
}
