import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  function makeContext(): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('allows a @Public() route through without invoking passport', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    // The parent AuthGuard.canActivate must not run for a public route.
    const superCanActivate = jest.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype),
      'canActivate',
    );

    expect(guard.canActivate(makeContext())).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('delegates to the passport JWT guard for a non-public route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const superCanActivate = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);

    const context = makeContext();
    expect(guard.canActivate(context)).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(context);
  });
});
