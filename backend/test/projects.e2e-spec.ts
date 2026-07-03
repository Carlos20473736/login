import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let accessToken2: string;
  let projectId: string;

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

    // Criar usuário 1 e obter token
    const user1Email = `projects-e2e-1-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'User 1', email: user1Email, password: '123456' });

    const login1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user1Email, password: '123456' });
    accessToken = login1.body.data.access_token;

    // Criar usuário 2 e obter token
    const user2Email = `projects-e2e-2-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'User 2', email: user2Email, password: '123456' });

    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user2Email, password: '123456' });
    accessToken2 = login2.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects', () => {
    it('deve criar um projeto', () => {
      return request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Meu Projeto', description: 'Descrição do projeto' })
        .expect(201)
        .expect((res) => {
          expect(res.body.level).toBe('success');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.name).toBe('Meu Projeto');
          projectId = res.body.data.id;
        });
    });

    it('deve rejeitar criação sem nome', () => {
      return request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Sem nome' })
        .expect(400);
    });

    it('deve rejeitar criação sem autenticação', () => {
      return request(app.getHttpServer())
        .post('/projects')
        .send({ name: 'Projeto sem auth' })
        .expect(401);
    });
  });

  describe('GET /projects', () => {
    it('deve listar projetos do usuário', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.level).toBe('success');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
          expect(res.body.data[0].name).toBe('Meu Projeto');
        });
    });

    it('não deve listar projetos de outro usuário', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
        });
    });
  });

  describe('GET /projects/:id', () => {
    it('deve retornar um projeto específico', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.id).toBe(projectId);
          expect(res.body.data.name).toBe('Meu Projeto');
        });
    });

    it('não deve permitir acesso a projeto de outro usuário', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(404);
    });
  });

  describe('PUT /projects/:id', () => {
    it('deve atualizar um projeto', () => {
      return request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Projeto Atualizado' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.name).toBe('Projeto Atualizado');
        });
    });

    it('não deve permitir atualização por outro usuário', () => {
      return request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send({ name: 'Hack' })
        .expect(404);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('não deve permitir exclusão por outro usuário', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(404);
    });

    it('deve excluir um projeto', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.message).toContain('removido');
        });
    });
  });
});
