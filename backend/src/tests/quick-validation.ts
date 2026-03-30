/**
 * Quick validation tests (sem database)
 * Rodar: npx ts-node src/tests/quick-validation.ts
 */

import { config } from '../config/env';
import { logger } from '../utils/logger';
import { generateToken } from '../middleware/authMiddleware';

const tests: Array<{ name: string; fn: () => boolean }> = [
  {
    name: 'Validar variáveis de ambiente',
    fn: () => {
      try {
        if (config.OPENAI_API_KEY && config.JWT_SECRET && config.WORDPRESS_WEBHOOK_SECRET) {
          logger.info('Variáveis obrigatórias carregadas com sucesso');
          return true;
        }
        return false;
      } catch (error) {
        logger.error('Erro na validação de env:', error);
        return false;
      }
    },
  },
  {
    name: 'Gerar JWT Token',
    fn: () => {
      try {
        const token = generateToken('test-user');
        if (token && typeof token === 'string' && token.length > 20) {
          logger.info('Token gerado com sucesso:', token.substring(0, 20) + '...');
          return true;
        }
        return false;
      } catch (error) {
        logger.error('Erro ao gerar token:', error);
        return false;
      }
    },
  },
  {
    name: 'Validar configuração da aplicação',
    fn: () => {
      try {
        if (config.PORT && config.API_URL && config.JWT_SECRET) {
          logger.info('Config:', {
            PORT: config.PORT,
            API_URL: config.API_URL,
            ENV: config.NODE_ENV,
          });
          return true;
        }
        return false;
      } catch (error) {
        logger.error('Erro na config:', error);
        return false;
      }
    },
  },
  {
    name: 'Verificar OpenAI configuration',
    fn: () => {
      try {
        if (config.OPENAI_API_KEY && config.OPENAI_MODEL) {
          logger.info('OpenAI config (key masked):', {
            model: config.OPENAI_MODEL,
            keyPrefix: config.OPENAI_API_KEY.substring(0, 10) + '...',
          });
          return true;
        }
        logger.warn('OpenAI não está configurado');
        return false;
      } catch (error) {
        logger.error('Erro OpenAI:', error);
        return false;
      }
    },
  },
];

async function runValidation() {
  logger.info('Iniciando validação rápida (sem banco de dados)...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = test.fn();
      if (result) {
        logger.info(test.name);
        passed++;
      } else {
        logger.error(test.name + ' - FALHOU');
        failed++;
      }
    } catch (error) {
      logger.error(test.name + ' - ERRO:', error);
      failed++;
    }
    console.log('');
  }

  console.log('\n' + '='.repeat(50));
  logger.info(`Resultado: ${passed} passaram, ${failed} falharam`);
  console.log('='.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

runValidation().catch((error) => {
  logger.error('Validation error:', error);
  process.exit(1);
});
