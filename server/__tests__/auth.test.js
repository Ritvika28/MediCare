import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new patient', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('patient');

      const patient = await Patient.findOne({});
      expect(patient).toBeTruthy();
    });

    it('should reject duplicate email', async () => {
      await User.create({
        email: 'dup@example.com',
        password: 'password123',
        firstName: 'Dup',
        lastName: 'User',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'dup@example.com',
        password: 'password123',
        firstName: 'Dup',
        lastName: 'User',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        email: 'login@example.com',
        password: 'password123',
        firstName: 'Login',
        lastName: 'Test',
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
    });
  });
});
