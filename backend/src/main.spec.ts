jest.mock('helmet', () => jest.fn());

import { NestFactory } from '@nestjs/core';

jest.mock('@nestjs/core', () => {
  const mockApp = {
    use: jest.fn(),
    enableCors: jest.fn(),
    setGlobalPrefix: jest.fn(),
    useGlobalPipes: jest.fn(),
    listen: jest.fn().mockResolvedValue(undefined),
  };
  return {
    ...jest.requireActual('@nestjs/core'),
    NestFactory: {
      create: jest.fn().mockResolvedValue(mockApp),
    },
  };
});

describe('bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the app, configures middleware, and listens on the default port', async () => {
    process.env.PORT = '';
    process.env.FRONTEND_USER_ORIGIN = '';
    process.env.FRONTEND_ADMIN_ORIGIN = '';

    const mod = require('./main');
    await new Promise(process.nextTick);

    expect(NestFactory.create).toHaveBeenCalled();
  });
});
