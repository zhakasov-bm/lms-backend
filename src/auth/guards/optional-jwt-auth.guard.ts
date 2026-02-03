import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, _info: any, context: any) {
    const req = context?.switchToHttp?.().getRequest?.();
    const hasAuthHeader = Boolean(req?.headers?.authorization);

    if (err || !user) {
      if (hasAuthHeader) {
        throw err || new UnauthorizedException();
      }
      return null;
    }

    return user;
  }
}
