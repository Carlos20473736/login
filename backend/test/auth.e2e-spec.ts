import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    name: 'Teste E2E',
    email: `e2e-${Date.now()}@test.com`,
    password: '123456',
  };

  describe('POST /auth/register', () => {
    it('deve registrar um novo usuário', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.level).toBe('success');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('email', testUser.email);
          expect(res.body.data).not.toHaveProperty('password');
        });
    });

    it('deve rejeitar registro com e-mail duplicado', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409)
        .expect((res) => {
          expect(res.body.level).toBe('error');
          expect(res.body.message).toContain('já cadastrado');
        });
    });

    it('deve rejeitar registro com dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: '', email: 'invalido', password: '12' })
        .expect(400)
        .expect((res) => {
          expect(res.body.level).toBe('error');
        });
    });
  });

  describe('POST /auth/login', () => {
    it('deve fazer login com credenciais válidas', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201)
        .expect((res) => {
          expect(res.body.level).toBe('success');
          expect(res.body.data).toHaveProperty('access_token');
        });
    });

    it('deve rejeitar login com senha incorreta', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'senha-errada' })
        .expect(401)
        .expect((res) => {
          expect(res.body.level).toBe('error');
          expect(res.body.message).toContain('inválidas');
        });
    });

    it('deve rejeitar login com e-mail inexistente', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'naoexiste@test.com', password: '123456' })
        .expect(401)
        .expect((res) => {
          expect(res.body.level).toBe('error');
        });
    });
  });

  describe('GET /auth/me', () => {
    it('deve retornar dados do usuário autenticado', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const token = loginRes.body.data.access_token;

      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.level).toBe('success');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('email', testUser.email);
        });
    });

    it('deve rejeitar acesso sem token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('deve rejeitar acesso com token inválido', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });
  });
});
