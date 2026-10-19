import type { Credentials, Registration, User } from '../types/auth';
import { apiRequest } from './api';

interface UserResponse {
  data: { user: User };
}

export async function register(input: Registration): Promise<User> {
  const response = await apiRequest<UserResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data.user;
}

export async function login(input: Credentials): Promise<User> {
  const response = await apiRequest<UserResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data.user;
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST' });
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiRequest<UserResponse>('/auth/me');
  return response.data.user;
}
