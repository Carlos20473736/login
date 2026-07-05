'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { ApiResponse, User } from '@/features/types';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return null;
      const { data } = await api.get<ApiResponse<User>>('/auth/me');
      return data.data;
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const { data } = await api.post<ApiResponse<LoginResponse>>(
        '/auth/login',
        credentials,
      );
      return data.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const { data } = await api.post<ApiResponse<User>>(
        '/auth/register',
        userData,
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      router.push(`/auth/login?email=${encodeURIComponent(variables.email)}&password=${encodeURIComponent(variables.password)}`);
    },
  });

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Mesmo se falhar, limpar tokens locais
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    queryClient.clear();
    router.push('/auth/login');
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation,
    register: registerMutation,
    logout,
  };
}
