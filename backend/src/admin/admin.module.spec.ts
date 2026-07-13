jest.mock('../auth/auth.module', () => ({ AuthModule: class {} }));
jest.mock('../gacha/gacha.module', () => ({ GachaModule: class {} }));
jest.mock('../queue/queue.module', () => ({ QueueModule: class {} }));

import { AdminModule } from './admin.module';

describe('AdminModule', () => {
  it('should be defined', () => {
    expect(AdminModule).toBeDefined();
  });
});
