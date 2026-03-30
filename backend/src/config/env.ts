import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = [
  'OPENAI_API_KEY',
  'JWT_SECRET',
  'WORDPRESS_WEBHOOK_SECRET',
];

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

function validateEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n- ${missing.join('\n- ')}`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    if ((process.env.JWT_SECRET || '').length < 32) {
      throw new Error('JWT_SECRET must have at least 32 characters in production');
    }

    if ((process.env.WORDPRESS_WEBHOOK_SECRET || '').length < 32) {
      throw new Error('WORDPRESS_WEBHOOK_SECRET must have at least 32 characters in production');
    }

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production');
    }

    if (process.env.DB_PASSWORD === 'postgres') {
      throw new Error('DB_PASSWORD cannot be default in production');
    }
  }
}

// roda validação na inicialização
validateEnv();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),

  API_URL: process.env.API_URL || 'http://localhost:3000',

  DATABASE_URL: process.env.DATABASE_URL || '',

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT || 5432),
  DB_NAME: process.env.DB_NAME || 'content_generator',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',

  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  OPENAI_API_KEY: getEnv('OPENAI_API_KEY'),
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  WORDPRESS_URL: process.env.WORDPRESS_URL || 'http://localhost:8080',
  WORDPRESS_PLUGIN_ENDPOINT:
    process.env.WORDPRESS_PLUGIN_ENDPOINT ||
    '/index.php?rest_route=/content-generator/v1/receive-post',
  WORDPRESS_HEALTH_ENDPOINT:
    process.env.WORDPRESS_HEALTH_ENDPOINT ||
    '/index.php?rest_route=/content-generator/v1/health',

  WORDPRESS_WEBHOOK_SECRET: getEnv('WORDPRESS_WEBHOOK_SECRET'),

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),

  isProduction: () => process.env.NODE_ENV === 'production',
  isDevelopment: () => process.env.NODE_ENV === 'development',
};

export default config;
