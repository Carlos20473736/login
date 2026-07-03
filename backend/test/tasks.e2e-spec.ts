import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let projectId: string;
  let taskId: string;

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

    // Criar usuário e obter token
    const email = `tasks-e2e-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Task User', email, password: '123456' });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: '123456' });
    accessToken = login.body.data.access_token;

    // Criar projeto para as tarefas
    const projectRes = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Projeto para Tarefas' });
    projectId = projectRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects/:projectId/tasks', () => {
    it('deve criar uma tarefa com status padrão pendente', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Tarefa 1',
          description: 'Descrição da tarefa',
          dueDate: '2026-12-31',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.level).toBe('success');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.title).toBe('Tarefa 1');
          expect(res.body.data.status).toBe('pendente');
          expect(res.body.data.dueDate).toBe('2026-12-31');
          taskId = res.body.data.id;
        });
    });

    it('deve criar uma tarefa com status específico', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Tarefa 2',
          status: 'em_andamento',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.status).toBe('em_andamento');
        });
    });

    it('deve criar uma tarefa concluída', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Tarefa 3',
          status: 'concluida',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.status).toBe('concluida');
        });
    });

    it('deve rejeitar criação sem título', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Sem título' })
        .expect(400);
    });

    it('deve rejeitar status inválido', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Tarefa', status: 'invalido' })
        .expect(400);
    });
  });

  describe('GET /projects/:projectId/tasks', () => {
    it('deve listar todas as tarefas do projeto', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.level).toBe('success');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBe(3);
        });
    });

    it('deve filtrar tarefas por status pendente', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks?status=pendente`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBe(1);
          expect(res.body.data[0].status).toBe('pendente');
        });
    });

    it('deve filtrar tarefas por status em_andamento', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks?status=em_andamento`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBe(1);
          expect(res.body.data[0].status).toBe('em_andamento');
        });
    });

    it('deve filtrar tarefas por status concluida', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks?status=concluida`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBe(1);
          expect(res.body.data[0].status).toBe('concluida');
        });
    });
  });

  describe('GET /projects/:projectId/tasks/:id', () => {
    it('deve retornar uma tarefa específica', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.id).toBe(taskId);
          expect(res.body.data.title).toBe('Tarefa 1');
        });
    });
  });

  describe('PUT /projects/:projectId/tasks/:id', () => {
    it('deve atualizar título e descrição', () => {
      return request(app.getHttpServer())
        .put(`/projects/${projectId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Tarefa Atualizada', description: 'Nova descrição' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.title).toBe('Tarefa Atualizada');
          expect(res.body.data.description).toBe('Nova descrição');
        });
    });

    it('deve atualizar o status de uma tarefa', () => {
      return request(app.getHttpServer())
        .put(`/projects/${projectId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'em_andamento' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('em_andamento');
        });
    });
  });

  describe('DELETE /projects/:projectId/tasks/:id', () => {
    it('deve excluir uma tarefa', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.message).toContain('removida');
        });
    });

    it('deve retornar 404 para tarefa inexistente', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
