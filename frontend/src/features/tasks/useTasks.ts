'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { ApiResponse, Task, TaskStatus, PaginatedResponse } from '@/features/types';

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

export function useTasks(
  projectId: string,
  statusFilter?: TaskStatus,
  page: number = 1,
  limit: number = 10,
) {
  const queryClient = useQueryClient();

  const queryKey = ['tasks', projectId, statusFilter || 'all', page, limit];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const queryString = params.toString();
      const { data } = await api.get<ApiResponse<PaginatedResponse<Task>>>(
        `/projects/${projectId}/tasks?${queryString}`,
      );
      return data.data;
    },
    enabled: !!projectId,
  });

  const tasks = data?.items || [];
  const meta = data?.meta || { totalItems: 0, itemsPerPage: limit, currentPage: 1, totalPages: 1 };

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
    meta,
    isLoading,
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
  };
}
