const { createClient } = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
  }

  async connect() {
    if (!this.client) {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      await this.client.connect();
    }
    return this.client;
  }

  async get(key) {
    try {
      await this.connect();
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, expirationInSeconds = 300) {
    try {
      await this.connect();
      await this.client.setEx(key, expirationInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.connect();
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }
}

module.exports = new RedisClient();