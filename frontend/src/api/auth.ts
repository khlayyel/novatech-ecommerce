import api from '../utils/request';
import type { AuthResponse, User } from '../types';

export const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password });
  return data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
};

export const fetchMe = async (): Promise<User> => {
  const { data } = await api.get<{ user: User }>('/auth/me');
  return data.user;
};
