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
    boost: () => req<BoostResult>('likes', 'boost', 'POST'),
    favorite: (target_id: string) => req<{ ok: boolean }>('likes', 'favorite', 'POST', { target_id }),
    unfavorite: (target_id: string) => req<{ ok: boolean }>('likes', 'unfavorite', 'POST', { target_id }),
    favorites: () => req<{ favorites: FavoriteProfile[] }>('likes', 'favorites', 'GET'),
    trial: () => req<{ ok: boolean; days: number }>('likes', 'trial', 'POST'),
    undo: () => req<{ ok: boolean; restored_profile: Profile | null }>('likes', 'undo', 'POST'),
    view: (target_id: string) => req<{ ok: boolean }>('likes', 'view', 'POST', { target_id }),
    myViewers: () => req<ViewersResult>('likes', 'my_viewers', 'GET'),
    incognito: (enabled: boolean) => req<{ ok: boolean; incognito: boolean }>('likes', 'incognito', 'POST', { enabled }),
    incognitoStatus: () => req<{ incognito: boolean; is_premium: boolean }>('likes', 'incognito_status', 'GET'),
    report: (to_user_id: string, reason: string) => req<{ ok: boolean }>('likes', 'report', 'POST', { to_user_id, reason }),
  },
  matches: {
    list: () => req<{ matches: Match[] }>('matches', 'list', 'GET'),
    messages: (match_id: string) => req<{ messages: Message[] }>('matches', 'messages', 'GET', undefined, { match_id }),
    send: (match_id: string, text: string) => req<Message>('matches', 'send', 'POST', { match_id, text }),
    sendImage: (match_id: string, data: string) => req<Message>('matches', 'send_image', 'POST', { match_id, data }),
    typing: (match_id: string) => req<{ ok: boolean }>('matches', 'typing', 'POST', { match_id }),
    ping: () => req<{ ok: boolean }>('matches', 'ping', 'POST'),
  },
  wallet: {
    balance: () => req<{ balance: number }>('upload', 'wallet_balance', 'GET'),
    history: () => req<{ transactions: WalletTx[] }>('upload', 'wallet_history', 'GET'),
    topup: (coins: number) => req<{ ok: boolean; balance: number }>('upload', 'wallet_topup', 'POST', { coins }),
    giftCatalog: () => req<{ gifts: GiftItem[] }>('upload', 'gift_catalog', 'GET'),
    sendGift: (to_user_id: string, gift_id: string, message: string, match_id?: string) =>
      req<{ ok: boolean; balance: number; gift: string }>('upload', 'gift_send', 'POST', { to_user_id, gift_id, message, match_id }),
    giftsReceived: () => req<{ gifts: ReceivedGift[] }>('upload', 'gifts_received', 'GET'),
  },
  payment: {
    create: (plan: string) => req<PaymentResult>('upload', 'pay_create', 'POST', { plan }),
    status: (payment_id: string) => req<{ status: string; plan?: string }>('upload', 'pay_status', 'GET', undefined, { payment_id }),
  },
  upload: {
    photo: (data: string) => req<{ url: string; photos: string[] }>('upload', 'photo', 'POST', { data }),
    removePhoto: (url: string) => req<{ photos: string[] }>('upload', 'remove', 'POST', { url }),
    selfie: (data: string) => req<{ ok: boolean; status: string }>('upload', 'selfie', 'POST', { data }),
    selfieStatus: () => req<{ status: string }>('upload', 'selfie_status', 'GET'),
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
    userMatches: (user_id: string) => adminReq<{ matches: AdminMatch[] }>('user_matches', 'GET', undefined, { user_id }),
    readChat: (match_id: string) => adminReq<{ messages: AdminMessage[] }>('read_chat', 'GET', undefined, { match_id }),
    selfieRequests: () => adminReq<{ requests: SelfieRequest[] }>('selfie_requests'),
    approveSelfie: (user_id: string, approved: boolean) => adminReq<{ ok: boolean }>('approve_selfie', 'POST', { user_id, approved }),
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
export interface BoostResult {
  ok: boolean; boost_id: string; expires_at: string; used: number; limit: number; duration_min: number;
}
export interface FavoriteProfile {
  user_id: string; name: string; photo: string; age: number; city: string; verified: boolean; bio: string; created_at: string;
}
export interface AdminMatch {
  match_id: string; other_id: string; other_name: string; other_photo: string;
  created_at: string; last_message: string; messages_count: number;
}
export interface AdminMessage {
  id: string; sender_id: string; text: string; image_url: string | null;
  msg_type: string; created_at: string; sender_name: string;
}
export interface ProfileViewer {
  user_id: string; name: string; photo: string; age: number; city: string; verified: boolean; viewed_at: string;
}
export interface ViewersResult {
  locked: boolean; count: number; viewers: ProfileViewer[];
}
export interface SelfieRequest {
  user_id: string; email: string; selfie_url: string; status: string;
  created_at: string; name: string; age: number; photo: string;
}
export interface PaymentResult {
  payment_id: string; pay_url: string; amount: number; plan: string; provider: string;
}
export interface WalletTx {
  amount: number; type: string; description: string; created_at: string;
}
export interface GiftItem {
  id: string; name: string; emoji: string; price: number; description: string;
}
export interface ReceivedGift {
  id: string; from_user_id: string; name: string; emoji: string; price: number;
  message: string; created_at: string; sender_name: string; sender_photo: string;
}