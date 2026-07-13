jest.mock('../queue/queue.module', () => ({ QueueModule: class {} }));

import { GachaModule } from './gacha.module';

describe('GachaModule', () => {
  it('should be defined', () => {
    expect(GachaModule).toBeDefined();
  });
});
