import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

export const redisProvider: Provider = {
  provide: REDIS,
  useFactory: () => {
    const url = process.env.REDIS_URL;
    return new Redis(url);
  },
};
