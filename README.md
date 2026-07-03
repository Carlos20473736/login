# Mini Tracker — Gerenciador de Tarefas por Projeto

Aplicação full-stack para gerenciamento de tarefas organizadas por projetos, com autenticação JWT e isolamento de dados por usuário.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | NestJS (Express) + TypeScript |
| ORM/Banco | TypeORM + PostgreSQL |
| Frontend | Next.js 16 (App Router) + TypeScript |
| Dados no front | TanStack Query (React Query) |
| Auth | JWT (access token) + bcrypt |
| Container | Docker + docker-compose |
| Testes | Jest (unitário + e2e) |

## Pré-requisitos

- Docker e Docker Compose
- Node.js 22+ (para desenvolvimento local)
- pnpm (para desenvolvimento local)

## Como rodar (Docker)

```bash
# Clonar o repositório
git clone <url-do-repo>
cd mini-tracker

# Subir todos os serviços com um comando
docker compose up --build -d

# Acessar:
# - Frontend: http://localhost:3001
# - API: http://localhost:3000
# - Health check: http://localhost:3000/health
```

## Como rodar (Desenvolvimento local)

```bash
# 1. Subir apenas o banco de dados
docker compose up postgres -d

# 2. Backend
cd backend
cp .env.example .env
pnpm install
pnpm run start:dev

# 3. Frontend (em outro terminal)
cd frontend
cp .env.example .env.local
pnpm install
pnpm run dev
```

## Variáveis de ambiente

### Backend (`.env`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=minitracker
DB_PASSWORD=minitracker123
DB_DATABASE=minitracker
JWT_SECRET=sua-chave-secreta-aqui
JWT_EXPIRES_IN=1h
APP_PORT=3000
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Endpoints da API

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Registrar novo usuário |
| POST | `/auth/login` | Login (retorna JWT) |
| GET | `/auth/me` | Dados do usuário autenticado |

### Projetos (requer JWT)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/projects` | Criar projeto |
| GET | `/projects` | Listar projetos do usuário |
| GET | `/projects/:id` | Detalhar projeto |
| PUT | `/projects/:id` | Atualizar projeto |
| DELETE | `/projects/:id` | Excluir projeto |

### Tarefas (requer JWT)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/projects/:projectId/tasks` | Criar tarefa |
| GET | `/projects/:projectId/tasks` | Listar tarefas (filtro: `?status=`) |
| GET | `/projects/:projectId/tasks/:id` | Detalhar tarefa |
| PUT | `/projects/:projectId/tasks/:id` | Atualizar tarefa |
| DELETE | `/projects/:projectId/tasks/:id` | Excluir tarefa |

**Status possíveis:** `pendente`, `em_andamento`, `concluida`

## Formato de resposta da API

Todas as respostas seguem o envelope padrão:

```json
{
  "level": "success | error",
  "message": "Mensagem legível",
  "data": {},
  "error": { "fields": [] }
}
```

## Testes

```bash
cd backend

# Teste unitário
pnpm run test

# Testes e2e (requer banco rodando)
pnpm run test:e2e
```

### Cobertura de testes

| Suite | Testes |
|-------|--------|
| auth.service.spec (unitário) | 5 |
| auth.e2e-spec | 9 |
| projects.e2e-spec | 11 |
| tasks.e2e-spec | 14 |
| **Total** | **39** |

## Estrutura do projeto

```
mini-tracker/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── health.controller.ts
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── guards/
│   │   │   └── interceptors/
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   ├── data-source.ts
│   │   │   └── migrations/
│   │   └── modules/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── projects/
│   │       └── tasks/
│   └── test/
│       ├── auth.e2e-spec.ts
│       ├── projects.e2e-spec.ts
│       └── tasks.e2e-spec.ts
└── frontend/
    ├── Dockerfile
    ├── .env.example
    ├── package.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── auth/
        │   │   ├── login/page.tsx
        │   │   └── register/page.tsx
        │   ├── dashboard/page.tsx
        │   └── projects/[id]/page.tsx
        ├── components/
        │   └── Header.tsx
        ├── hooks/
        │   ├── useAuth.ts
        │   ├── useProjects.ts
        │   └── useTasks.ts
        └── lib/
            ├── api.ts
            ├── providers.tsx
            └── types.ts
```

## Decisões técnicas

1. **Migrations manuais** — `synchronize: false` + `migrationsRun: true` para controle total do schema
2. **Isolamento por usuário** — Projetos e tarefas são filtrados pelo userId do JWT
3. **Cascade delete** — Excluir projeto remove automaticamente suas tarefas
4. **TanStack Query** — Cache inteligente com invalidação automática após mutations
5. **Interceptor global** — Envelope padronizado para todas as respostas (sucesso e erro)
6. **Guard reutilizável** — `@UseGuards(JwtAuthGuard)` aplicado no nível do controller

## O que faria diferente com mais tempo

1. **Refresh Token** — Implementaria um fluxo de refresh token com rotação automática para melhor segurança e UX (sem forçar re-login frequente).

2. **Testes E2E no frontend com Playwright** — Cobriria os fluxos críticos (login, criar projeto, criar tarefa, filtrar) com testes automatizados de ponta a ponta no navegador.

3. **Paginação e ordenação** — Adicionaria paginação server-side na listagem de tarefas com cursor-based pagination, além de ordenação por data de vencimento e data de criação.

4. **Dockerfile multi-stage (dev/prod)** — Separaria os estágios de build com target `development` (hot-reload) e `production` (imagem otimizada com apenas o dist).

5. **CI/CD com GitHub Actions** — Pipeline automatizado com lint, testes, build e deploy em staging a cada push na main.

6. **Validação mais robusta** — Adicionaria rate limiting, sanitização de inputs e validação de força de senha no registro.

7. **Soft delete e auditoria** — Implementaria soft delete nas entidades com campo `deletedAt` e uma tabela de audit log para rastreabilidade.

8. **Dark mode** — Tema escuro via CSS variables com toggle no header, persistido no localStorage.

9. **Notificações em tempo real** — WebSocket (Socket.io) para notificar quando uma tarefa muda de status em projetos compartilhados (se fosse evoluir para multi-usuário por projeto).

10. **Documentação da API com Swagger** — Decorators do `@nestjs/swagger` para gerar documentação interativa automaticamente.
