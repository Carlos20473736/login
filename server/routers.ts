import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getProjectsByUserId,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getTasksByProjectId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getProjectStats,
  getUserByEmail,
  createUserWithPassword,
} from "./db";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    register: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        email: z.string().email().max(320),
        password: z.string().min(6).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new Error("E-mail já cadastrado");
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = await createUserWithPassword({
          name: input.name,
          email: input.email,
          passwordHash,
        });
        if (!user) throw new Error("Erro ao criar usuário");
        // Set session cookie
        const token = await sdk.createSessionToken(user.openId, { name: user.name || input.name || 'User' });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
        keepLoggedIn: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new Error("E-mail ou senha incorretos");
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new Error("E-mail ou senha incorretos");
        }
        // Set session cookie
        const token = await sdk.createSessionToken(user.openId, { name: user.name || user.email || 'User' });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        // If keepLoggedIn, set cookie to expire in 30 days; otherwise session cookie
        const maxAge = input.keepLoggedIn ? 30 * 24 * 60 * 60 * 1000 : undefined;
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, ...(maxAge ? { maxAge } : {}) });
        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
      }),
  }),

  projects: router({
    list: protectedProcedure.query(({ ctx }) => {
      return getProjectsByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        return getProjectById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).nullable().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return createProject({
          name: input.name,
          description: input.description ?? null,
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).nullable().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return updateProject(input.id, ctx.user.id, {
          name: input.name,
          description: input.description,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return deleteProject(input.id, ctx.user.id);
      }),

    stats: protectedProcedure.query(({ ctx }) => {
      return getProjectStats(ctx.user.id);
    }),
  }),

  tasks: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        status: z.enum(["pendente", "em_andamento", "concluida"]).optional(),
      }))
      .query(({ ctx, input }) => {
        return getTasksByProjectId(input.projectId, ctx.user.id, input.status);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        return getTaskById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(2000).nullable().optional(),
        status: z.enum(["pendente", "em_andamento", "concluida"]).optional(),
        dueDate: z.number().nullable().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate project ownership
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) {
          throw new Error("Project not found or access denied");
        }
        return createTask({
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? "pendente",
          dueDate: input.dueDate ?? null,
          projectId: input.projectId,
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).nullable().optional(),
        status: z.enum(["pendente", "em_andamento", "concluida"]).optional(),
        dueDate: z.number().nullable().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return updateTask(input.id, ctx.user.id, {
          title: input.title,
          description: input.description,
          status: input.status,
          dueDate: input.dueDate,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return deleteTask(input.id, ctx.user.id);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pendente", "em_andamento", "concluida"]),
      }))
      .mutation(({ ctx, input }) => {
        return updateTask(input.id, ctx.user.id, { status: input.status });
      }),
  }),
});

export type AppRouter = typeof appRouter;
