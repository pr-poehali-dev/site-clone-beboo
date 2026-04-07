const URLS = {
  auth: 'https://functions.poehali.dev/9589e7b7-818e-4277-9a27-7c807f8ff209',
  profiles: 'https://functions.poehali.dev/143217b2-f29d-46bf-b390-36ada3c65f7c',
  likes: 'https://functions.poehali.dev/a3b4c36c-edb2-442f-aea2-3dec125ce967',
  matches: 'https://functions.poehali.dev/c1dfe780-576c-400a-9815-c828cf3b6789',
  upload: 'https://functions.poehali.dev/37707e50-2c44-422a-9fbe-88d051d4f2d0',
};

function getToken(): string {
  return localStorage.getItem('spark_token') || '';
}

async function req<T>(
  service: keyof typeof URLS,
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<T> {
  const res = await fetch(`${URLS[service]}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': getToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data as T;
}

export const api = {
  auth: {
    register: (email: string, password: string, name: string, age: number, gender: string) =>
      req<{ token: string; user_id: string; name: string }>('auth', '/register', 'POST', { email, password, name, age, gender }),
    login: (email: string, password: string) =>
      req<{ token: string; user_id: string; name: string }>('auth', '/login', 'POST', { email, password }),
    me: () =>
      req<UserProfile>('auth', '/me', 'GET'),
    logout: () =>
      req<{ ok: boolean }>('auth', '/logout', 'POST'),
  },
  profiles: {
    discover: () =>
      req<{ profiles: Profile[] }>('profiles', '/discover', 'GET'),
    my: () =>
      req<UserProfile>('profiles', '/my', 'GET'),
    update: (data: Partial<UserProfile>) =>
      req<{ ok: boolean }>('profiles', '/update', 'PUT', data),
    get: (userId: string) =>
      req<Profile>('profiles', `/profile/${userId}`, 'GET'),
  },
  likes: {
    like: (to_user_id: string, is_super = false) =>
      req<{ is_match: boolean; match_id: string | null; profile: { name: string; photo: string } }>('likes', '/like', 'POST', { to_user_id, is_super }),
    pass: (to_user_id: string) =>
      req<{ ok: boolean }>('likes', '/pass', 'POST', { to_user_id }),
    incoming: () =>
      req<{ likes: IncomingLike[] }>('likes', '/incoming', 'GET'),
  },
  matches: {
    list: () =>
      req<{ matches: Match[] }>('matches', '/list', 'GET'),
    messages: (match_id: string) =>
      req<{ messages: Message[] }>('matches', `/messages/${match_id}`, 'GET'),
    send: (match_id: string, text: string) =>
      req<Message>('matches', '/send', 'POST', { match_id, text }),
  },
  upload: {
    photo: (data: string) =>
      req<{ url: string; photos: string[] }>('upload', '/photo', 'POST', { data }),
    removePhoto: (url: string) =>
      req<{ photos: string[] }>('upload', '/photo/remove', 'POST', { url }),
  },
};

export interface Profile {
  user_id: string;
  name: string;
  age: number;
  gender: string;
  city: string;
  bio: string;
  photos: string[];
  tags: string[];
  job: string;
  education: string;
  height: number | null;
  verified: boolean;
  online: boolean;
  distance: number;
}

export interface UserProfile extends Profile {
  search_radius: number;
  search_gender: string;
  search_age_min: number;
  search_age_max: number;
}

export interface IncomingLike {
  user_id: string;
  name: string;
  photo: string;
  age: number;
  is_super: boolean;
  created_at: string;
}

export interface Match {
  match_id: string;
  other_user_id: string;
  name: string;
  photo: string;
  age: number;
  verified: boolean;
  matched_at: string;
  last_message: string | null;
  last_time: string | null;
  unread: number;
  online: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  text: string;
  read: boolean;
  created_at: string;
}
