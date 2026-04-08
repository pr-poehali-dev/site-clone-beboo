const URLS = {
  auth:     'https://functions.poehali.dev/9589e7b7-818e-4277-9a27-7c807f8ff209',
  profiles: 'https://functions.poehali.dev/143217b2-f29d-46bf-b390-36ada3c65f7c',
  likes:    'https://functions.poehali.dev/a3b4c36c-edb2-442f-aea2-3dec125ce967',
  matches:  'https://functions.poehali.dev/c1dfe780-576c-400a-9815-c828cf3b6789',
  upload:   'https://functions.poehali.dev/37707e50-2c44-422a-9fbe-88d051d4f2d0',
};

export const ADMIN_KEY = 'sparkladmin2024';

function getToken(): string {
  return localStorage.getItem('spark_token') || '';
}

async function req<T>(
  service: keyof typeof URLS,
  action: string,
  method = 'GET',
  body?: unknown,
  extraParams?: Record<string, string>,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const params = new URLSearchParams({ action, ...extraParams });
  const res = await fetch(`${URLS[service]}?${params}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': getToken(),
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

async function adminReq<T>(action: string, method = 'GET', body?: unknown, extraParams?: Record<string, string>): Promise<T> {
  return req<T>('upload', action, method, body, extraParams, { 'X-Admin-Key': ADMIN_KEY });
}

export const api = {
  auth: {
    register: (email: string, password: string, name: string, age: number, gender: string) =>
      req<{ token: string; user_id: string; name: string }>('auth', 'register', 'POST', { email, password, name, age, gender }),
    login: (email: string, password: string) =>
      req<{ token: string; user_id: string; name: string }>('auth', 'login', 'POST', { email, password }),
    me: () => req<UserProfile>('auth', 'me', 'GET'),
    logout: () => req<{ ok: boolean }>('auth', 'logout', 'POST'),
  },
  profiles: {
    discover: () => req<{ profiles: Profile[] }>('profiles', 'discover', 'GET'),
    my: () => req<UserProfile>('profiles', 'my', 'GET'),
    update: (data: Partial<UserProfile>) => req<{ ok: boolean }>('profiles', 'update', 'POST', data),
    get: (userId: string) => req<Profile>('profiles', 'get', 'GET', undefined, { user_id: userId }),
  },
  likes: {
    like: (to_user_id: string, is_super = false) =>
      req<{ is_match: boolean; match_id: string | null; profile: { name: string; photo: string } }>('likes', 'like', 'POST', { to_user_id, is_super }),
    pass: (to_user_id: string) => req<{ ok: boolean }>('likes', 'pass', 'POST', { to_user_id }),
    incoming: () => req<{ likes: IncomingLike[] }>('likes', 'incoming', 'GET'),
  },
  matches: {
    list: () => req<{ matches: Match[] }>('matches', 'list', 'GET'),
    messages: (match_id: string) => req<{ messages: Message[] }>('matches', 'messages', 'GET', undefined, { match_id }),
    send: (match_id: string, text: string) => req<Message>('matches', 'send', 'POST', { match_id, text }),
    sendImage: (match_id: string, data: string) => req<Message>('matches', 'send_image', 'POST', { match_id, data }),
  },
  upload: {
    photo: (data: string) => req<{ url: string; photos: string[] }>('upload', 'photo', 'POST', { data }),
    removePhoto: (url: string) => req<{ photos: string[] }>('upload', 'remove', 'POST', { url }),
  },
  admin: {
    stats: () => adminReq<AdminStats>('stats'),
    users: (page = 1, search = '') => adminReq<{ users: AdminUser[]; total: number; page: number }>('users', 'GET', undefined, { page: String(page), search }),
    userDetail: (user_id: string) => adminReq<AdminUserDetail>('user_detail', 'GET', undefined, { user_id }),
    ban: (user_id: string, reason: string) => adminReq<{ ok: boolean }>('ban', 'POST', { user_id, reason }),
    unban: (user_id: string) => adminReq<{ ok: boolean }>('unban', 'POST', { user_id }),
    verify: (user_id: string, verified: boolean) => adminReq<{ ok: boolean }>('verify', 'POST', { user_id, verified }),
    grantPremium: (user_id: string, days = 30) => adminReq<{ ok: boolean }>('grant_premium', 'POST', { user_id, days }),
    revokePremium: (user_id: string) => adminReq<{ ok: boolean }>('revoke_premium', 'POST', { user_id }),
    settings: () => adminReq<{ settings: AppSetting[] }>('settings'),
    updateSetting: (key: string, value: string) => adminReq<{ ok: boolean }>('update_setting', 'POST', { key, value }),
    reports: () => adminReq<{ reports: Report[] }>('reports'),
    resolveReport: (report_id: string) => adminReq<{ ok: boolean }>('resolve_report', 'POST', { report_id }),
    topUsers: () => adminReq<{ users: TopUser[] }>('top_users'),
  },
};

// ── Types ────────────────────────────────────────────────────────────
export interface Profile {
  user_id: string; name: string; age: number; gender: string;
  city: string; bio: string; photos: string[]; tags: string[];
  job: string; education: string; height: number | null;
  verified: boolean; online: boolean; distance: number;
}
export interface UserProfile extends Profile {
  search_radius: number; search_gender: string;
  search_age_min: number; search_age_max: number;
  is_premium?: boolean; is_admin?: boolean;
}
export interface IncomingLike {
  user_id: string; name: string; photo: string; age: number; is_super: boolean; created_at: string;
}
export interface Match {
  match_id: string; other_user_id: string; name: string; photo: string; age: number;
  verified: boolean; is_premium?: boolean; matched_at: string;
  last_message: string | null; last_time: string | null; unread: number; online: boolean;
}
export interface Message {
  id: string; sender_id: string; text: string; image_url?: string | null;
  msg_type: 'text' | 'image'; read: boolean; created_at: string; is_mine?: boolean;
}
export interface AdminStats {
  total_users: number; new_today: number; new_week: number; total_matches: number;
  total_messages: number; total_likes: number; premium_users: number;
  banned_users: number; open_reports: number;
  daily_signups: { date: string; count: number }[];
}
export interface AdminUser {
  id: string; email: string; is_admin: boolean; created_at: string;
  name: string; age: number; gender: string; city: string;
  is_premium: boolean; photos_count: number; is_banned: boolean; verified: boolean;
}
export interface AdminUserDetail extends AdminUser {
  bio: string; photos: string[]; tags: string[]; job: string; height: number;
  stats: { likes_sent: number; likes_received: number; matches: number; messages: number };
}
export interface AppSetting { key: string; value: string; description: string; }
export interface Report {
  id: string; from_user_id: string; to_user_id: string; reason: string;
  status: string; created_at: string; from_name: string; to_name: string;
}
export interface TopUser {
  user_id: string; name: string; age: number; messages: number; matches: number; is_premium: boolean; verified: boolean;
}