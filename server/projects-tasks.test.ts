import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getProjectsByUserId: vi.fn(),
  getProjectById: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getTasksByProjectId: vi.fn(),
  getTaskById: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getProjectStats: vi.fn(),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("projects router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists projects for authenticated user", async () => {
    const mockProjects = [
      { id: 1, name: "Project 1", description: "Desc 1", userId: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: "Project 2", description: null, userId: 1, createdAt: new Date(), updatedAt: new Date() },
    ];
    vi.mocked(db.getProjectsByUserId).mockResolvedValue(mockProjects);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.projects.list();

    expect(result).toEqual(mockProjects);
    expect(db.getProjectsByUserId).toHaveBeenCalledWith(1);
  });

  it("rejects unauthenticated access to projects.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.projects.list()).rejects.toThrow();
  });

  it("creates a project", async () => {
    const mockProject = { id: 1, name: "New Project", description: "A description", userId: 1, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.createProject).mockResolvedValue(mockProject);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.projects.create({ name: "New Project", description: "A description" });

    expect(result).toEqual(mockProject);
    expect(db.createProject).toHaveBeenCalledWith({
      name: "New Project",
      description: "A description",
      userId: 1,
    });
  });

  it("updates a project", async () => {
    const mockProject = { id: 1, name: "Updated", description: "Updated desc", userId: 1, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.updateProject).mockResolvedValue(mockProject);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.projects.update({ id: 1, name: "Updated", description: "Updated desc" });

    expect(result).toEqual(mockProject);
    expect(db.updateProject).toHaveBeenCalledWith(1, 1, { name: "Updated", description: "Updated desc" });
  });

  it("deletes a project", async () => {
    vi.mocked(db.deleteProject).mockResolvedValue({ success: true });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.projects.delete({ id: 1 });

    expect(result).toEqual({ success: true });
    expect(db.deleteProject).toHaveBeenCalledWith(1, 1);
  });

  it("gets project stats", async () => {
    const mockStats = { totalProjects: 3, totalTasks: 10, pendingTasks: 4, inProgressTasks: 3, completedTasks: 3 };
    vi.mocked(db.getProjectStats).mockResolvedValue(mockStats);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.projects.stats();

    expect(result).toEqual(mockStats);
    expect(db.getProjectStats).toHaveBeenCalledWith(1);
  });
});

describe("tasks router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists tasks for a project", async () => {
    const mockTasks = [
      { id: 1, title: "Task 1", description: null, status: "pendente", dueDate: null, projectId: 1, userId: 1, createdAt: new Date(), updatedAt: new Date() },
    ];
    vi.mocked(db.getTasksByProjectId).mockResolvedValue(mockTasks);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.list({ projectId: 1 });

    expect(result).toEqual(mockTasks);
    expect(db.getTasksByProjectId).toHaveBeenCalledWith(1, 1, undefined);
  });

  it("lists tasks filtered by status", async () => {
    vi.mocked(db.getTasksByProjectId).mockResolvedValue([]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.tasks.list({ projectId: 1, status: "em_andamento" });

    expect(db.getTasksByProjectId).toHaveBeenCalledWith(1, 1, "em_andamento");
  });

  it("creates a task", async () => {
    const mockProject = { id: 1, name: "Project 1", description: null, userId: 1, createdAt: new Date(), updatedAt: new Date() };
    const mockTask = { id: 1, title: "New Task", description: null, status: "pendente", dueDate: 1719900000000, projectId: 1, userId: 1, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.getProjectById).mockResolvedValue(mockProject);
    vi.mocked(db.createTask).mockResolvedValue(mockTask);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.create({
      title: "New Task",
      projectId: 1,
      dueDate: 1719900000000,
    });

    expect(result).toEqual(mockTask);
    expect(db.getProjectById).toHaveBeenCalledWith(1, 1);
    expect(db.createTask).toHaveBeenCalledWith({
      title: "New Task",
      description: null,
      status: "pendente",
      dueDate: 1719900000000,
      projectId: 1,
      userId: 1,
    });
  });

  it("rejects task creation for non-owned project", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tasks.create({ title: "Task", projectId: 999 })
    ).rejects.toThrow("Project not found or access denied");
  });

  it("updates task status", async () => {
    const mockTask = { id: 1, title: "Task", description: null, status: "concluida", dueDate: null, projectId: 1, userId: 1, createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.updateTask).mockResolvedValue(mockTask);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.updateStatus({ id: 1, status: "concluida" });

    expect(result).toEqual(mockTask);
    expect(db.updateTask).toHaveBeenCalledWith(1, 1, { status: "concluida" });
  });

  it("deletes a task", async () => {
    vi.mocked(db.deleteTask).mockResolvedValue({ success: true });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.delete({ id: 1 });

    expect(result).toEqual({ success: true });
    expect(db.deleteTask).toHaveBeenCalledWith(1, 1);
  });

  it("rejects unauthenticated access to tasks.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tasks.list({ projectId: 1 })).rejects.toThrow();
  });

  it("validates task status enum", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tasks.updateStatus({ id: 1, status: "invalid_status" as any })
    ).rejects.toThrow();
  });
});
