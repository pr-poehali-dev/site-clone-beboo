import { useState, useEffect, useCallback } from 'react';
import { api, UserProfile } from '@/api/client';

export interface DailyReward { coins: number; day: number; is_new: boolean; }

export interface AuthState {
  isLoading: boolean;
  isAuthed: boolean;
  isAdmin: boolean;
  user: UserProfile | null;
  userId: string | null;
  token: string | null;
  dailyReward: DailyReward | null;
  clearDailyReward: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, age: number, gender: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [dailyReward, setDailyReward] = useState<DailyReward | null>(null);

  // Единая функция получения профиля — проверяет daily_reward
  const fetchMe = useCallback(async (): Promise<UserProfile> => {
    const u = await api.auth.me();
    setUser(u);
    if (u.daily_reward?.is_new) {
      setDailyReward(u.daily_reward);
    }
    return u;
  }, []);

  // При загрузке приложения
  useEffect(() => {
    const savedToken = localStorage.getItem('spark_token');
    const savedUserId = localStorage.getItem('spark_user_id');
    if (savedToken && savedUserId) {
      setToken(savedToken);
      setUserId(savedUserId);
      fetchMe()
        .catch(() => {
          localStorage.removeItem('spark_token');
          localStorage.removeItem('spark_user_id');
          setToken(null);
          setUserId(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    localStorage.setItem('spark_token', res.token);
    localStorage.setItem('spark_user_id', res.user_id);
    setToken(res.token);
    setUserId(res.user_id);
    await fetchMe(); // <-- теперь daily_reward устанавливается после login
  };

  const register = async (email: string, password: string, name: string, age: number, gender: string) => {
    const res = await api.auth.register(email, password, name, age, gender);
    localStorage.setItem('spark_token', res.token);
    localStorage.setItem('spark_user_id', res.user_id);
    setToken(res.token);
    setUserId(res.user_id);
    await fetchMe(); // <-- и после register
  };

  const logout = () => {
    api.auth.logout().catch(() => {});
    localStorage.removeItem('spark_token');
    localStorage.removeItem('spark_user_id');
    setToken(null);
    setUserId(null);
    setUser(null);
    setDailyReward(null);
  };

  const refreshUser = async () => {
    await fetchMe();
  };

  return {
    isLoading,
    isAuthed: !!token && !!user,
    isAdmin: !!(user as UserProfile & { is_admin?: boolean })?.is_admin,
    user,
    userId,
    token,
    dailyReward,
    clearDailyReward: () => setDailyReward(null),
    login,
    register,
    logout,
    refreshUser,
  };
}
