import { authMiddleware, generateToken } from '../../middleware/authMiddleware';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

describe('Auth Middleware', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken('user123');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token) as any;
      expect(decoded.sub).toBe('user123');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should respect custom expiration time', () => {
      const token = generateToken('user123', '1h');
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
    });
  });

  describe('authMiddleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let jsonSpy: jest.Mock;
    let statusSpy: jest.Mock;

    beforeEach(() => {
      jsonSpy = jest.fn().mockReturnValue({});
      statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });

      req = {
        headers: {},
      };
      res = {
        status: statusSpy,
      };
      next = jest.fn();
    });

    it('should return 401 if no authorization header', () => {
      authMiddleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header is invalid', () => {
      req.headers = { authorization: 'InvalidFormat' };

      authMiddleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should set user on request with valid token', () => {
      const token = generateToken('user123');
      req.headers = { authorization: `Bearer ${token}` };

      authMiddleware(req as Request, res as Response, next);

      expect((req as any).user).toBeDefined();
      expect((req as any).user.sub).toBe('user123');
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 for expired token', () => {
      const expiredToken = jwt.sign(
        { sub: 'user123', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'test-secret'
      );
      req.headers = { authorization: `Bearer ${expiredToken}` };

      authMiddleware(req as Request, res as Response, next);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalled();
    });
  });
});
