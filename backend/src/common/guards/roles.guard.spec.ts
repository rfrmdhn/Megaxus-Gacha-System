import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../../generated/prisma';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  function makeContext(user?: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  }

  // Route metadata is looked up per key (IS_PUBLIC_KEY then ROLES_KEY), so the
  // mock resolves by key rather than returning one value for every call.
  function mockMeta({
    isPublic,
    roles,
  }: {
    isPublic?: boolean;
    roles?: Role[];
  }) {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === IS_PUBLIC_KEY) return isPublic;
        if (key === ROLES_KEY) return roles;
        return undefined;
      });
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows a @Public() route through without checking roles', () => {
    mockMeta({ isPublic: true, roles: [Role.admin] });

    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows access when no roles are required', () => {
    mockMeta({ roles: undefined });

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows access when roles array is empty', () => {
    mockMeta({ roles: [] });

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows access when user has the required role', () => {
    mockMeta({ roles: [Role.admin] });

    expect(guard.canActivate(makeContext({ role: Role.admin }))).toBe(true);
  });

  it('throws ForbiddenException when user does not have the required role', () => {
    mockMeta({ roles: [Role.admin] });

    expect(() => guard.canActivate(makeContext({ role: 'user' }))).toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when user is undefined', () => {
    mockMeta({ roles: [Role.admin] });

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when user object has no role', () => {
    mockMeta({ roles: [Role.admin] });

    expect(() => guard.canActivate(makeContext({}))).toThrow(
      ForbiddenException,
    );
  });
});
