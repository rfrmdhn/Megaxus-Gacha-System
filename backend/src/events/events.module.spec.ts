jest.mock('../gacha/gacha.module', () => ({ GachaModule: class {} }));

import { EventsModule } from './events.module';

describe('EventsModule', () => {
  it('should be defined', () => {
    expect(EventsModule).toBeDefined();
  });
});
