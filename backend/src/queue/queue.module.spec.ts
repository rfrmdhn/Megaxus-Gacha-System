jest.mock('@nestjs/bullmq', () => ({
  BullModule: {
    forRootAsync: jest.fn().mockReturnValue(class {}),
    registerQueue: jest.fn().mockReturnValue(class {}),
  },
  InjectQueue: function () {
    return function () {};
  },
  Processor: function () {
    return class {};
  },
  WorkerHost: class {},
}));
jest.mock('@nestjs/config', () => ({
  ConfigModule: class {},
  ConfigService: class {},
}));
jest.mock('bullmq', () => ({
  Queue: class {},
  Job: class {},
}));
jest.mock('./admin-feed.producer', () => ({ AdminFeedProducer: class {} }));
jest.mock('./admin-feed.processor', () => ({ AdminFeedProcessor: class {} }));
jest.mock('./admin-feed.service', () => ({ AdminFeedService: class {} }));

import { QueueModule } from './queue.module';

describe('QueueModule', () => {
  it('should be defined', () => {
    expect(QueueModule).toBeDefined();
  });
});
