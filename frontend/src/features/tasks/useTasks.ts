'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { ApiResponse, Task, TaskStatus } from '@/features/types';

interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string;
}

interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string;
}

export function useTasks(projectId: string, statusFilter?: TaskStatus) {
  const queryClient = useQueryClient();

  const queryKey = ['tasks', projectId, statusFilter || 'all'];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const { data } = await api.get<ApiResponse<Task[]>>(
        `/projects/${projectId}/tasks${params}`,
      );
      return data.data;
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (taskData: CreateTaskData) => {
      const { data } = await api.post<ApiResponse<Task>>(
        `/projects/${projectId}/tasks`,
        taskData,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updateData
    }: UpdateTaskData & { id: string }) => {
      const { data } = await api.put<ApiResponse<Task>>(
        `/projects/${projectId}/tasks/${id}`,
        updateData,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${projectId}/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  return {
    tasks,
    isLoading,
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
  };
}
