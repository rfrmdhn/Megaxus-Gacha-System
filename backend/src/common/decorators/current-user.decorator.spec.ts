let capturedFactory: Function;

jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    createParamDecorator: (factory: Function) => {
      capturedFactory = factory;
      return (...args: any[]) => factory(args[1]);
    },
  };
});

require('./current-user.decorator');

describe('CurrentUser decorator', () => {
  it('returns the user property from the request object', () => {
    const user = { id: 'u1', email: 'test@test.com', role: 'user' };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    };

    const result = capturedFactory(undefined, context);

    expect(result).toEqual(user);
  });
});
