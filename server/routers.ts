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
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
