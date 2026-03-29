import request from 'supertest';
import createApp from '../../app';
import { describe } from 'node:test';

describe('Content Generation API', () => {
  const app = createApp();

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
    });
  });

  describe('GET /', () => {
    it('should return API info', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /json/);
        
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Content Generator Service');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('POST /api/generate-post', () => {
    it('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/generate-post')
        .send({ url: 'invalid-url' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing URL', async () => {
      const response = await request(app)
        .post('/api/generate-post')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
