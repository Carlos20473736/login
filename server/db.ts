import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, tasks, InsertProject, InsertTask } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== AUTH ==========

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithPassword(data: { name: string; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { nanoid } = await import('nanoid');
  const openId = `local_${nanoid(16)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: 'email',
  });
  const result = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== PROJECTS ==========

export async function getProjectsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
}

export async function getProjectById(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProject(data: { name: string; description?: string | null; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values({
    name: data.name,
    description: data.description ?? null,
    userId: data.userId,
  });
  const insertId = result[0].insertId;
  return getProjectById(insertId, data.userId);
}

export async function updateProject(projectId: number, userId: number, data: { name?: string; description?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (Object.keys(updateData).length === 0) return getProjectById(projectId, userId);
  await db.update(projects).set(updateData).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return getProjectById(projectId, userId);
}

export async function deleteProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return { success: true };
}

// ========== TASKS ==========

export async function getTasksByProjectId(projectId: number, userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(tasks.projectId, projectId), eq(tasks.userId, userId)];
  if (status && ["pendente", "em_andamento", "concluida"].includes(status)) {
    conditions.push(eq(tasks.status, status as "pendente" | "em_andamento" | "concluida"));
  }
  return db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
}

export async function getTaskById(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTask(data: { title: string; description?: string | null; status?: string; dueDate?: number | null; projectId: number; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values({
    title: data.title,
    description: data.description ?? null,
    status: (data.status as "pendente" | "em_andamento" | "concluida") ?? "pendente",
    dueDate: data.dueDate ?? null,
    projectId: data.projectId,
    userId: data.userId,
  });
  const insertId = result[0].insertId;
  return getTaskById(insertId, data.userId);
}

export async function updateTask(taskId: number, userId: number, data: { title?: string; description?: string | null; status?: string; dueDate?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (Object.keys(updateData).length === 0) return getTaskById(taskId, userId);
  await db.update(tasks).set(updateData).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  return getTaskById(taskId, userId);
}

export async function deleteTask(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  return { success: true };
}

export async function getProjectStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalProjects: 0, totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0 };
  
  const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
  const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
  
  return {
    totalProjects: userProjects.length,
    totalTasks: userTasks.length,
    pendingTasks: userTasks.filter(t => t.status === "pendente").length,
    inProgressTasks: userTasks.filter(t => t.status === "em_andamento").length,
    completedTasks: userTasks.filter(t => t.status === "concluida").length,
  };
}
