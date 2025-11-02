import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: false, // Connect immediately
};

// Publisher instance
export const redisPublisher = new Redis(redisConfig);

// Subscriber instance (MUST be separate)
export const redisSubscriber = new Redis(redisConfig);

// Publisher events
redisPublisher.on('connect', () => {
  console.log('✅ Redis Publisher connected');
});

redisPublisher.on('ready', () => {
  console.log('✅ Redis Publisher ready');
});

redisPublisher.on('error', (err) => {
  console.error('❌ Redis Publisher error:', err);
});

// Subscriber events
redisSubscriber.on('connect', () => {
  console.log('✅ Redis Subscriber connected');
});

redisSubscriber.on('ready', () => {
  console.log('✅ Redis Subscriber ready');
});

redisSubscriber.on('error', (err) => {
  console.error('❌ Redis Subscriber error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisPublisher.quit();
  await redisSubscriber.quit();
  process.exit(0);
});
