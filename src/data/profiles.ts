export interface Profile {
  id: string;
  name: string;
  age: number;
  city: string;
  distance: number;
  bio: string;
  photos: string[];
  tags: string[];
  job?: string;
  education?: string;
  height?: number;
  verified: boolean;
  online?: boolean;
}

export const profiles: Profile[] = [
  {
    id: '1',
    name: 'София',
    age: 24,
    city: 'Москва',
    distance: 3,
    bio: 'Люблю путешествовать и пробовать новые кофейни. В поисках человека, с которым не страшно потеряться в незнакомом городе ✈️',
    photos: [
      'https://cdn.poehali.dev/projects/9af0fc17-cee5-4084-8bef-c980d431deb0/files/b41bdc7a-d71f-4bc2-a728-74a4d7782902.jpg',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
    ],
    tags: ['Путешествия', 'Кофе', 'Фото', 'Йога'],
    job: 'Дизайнер',
    education: 'МГУ',
    height: 168,
    verified: true,
    online: true,
  },
  {
    id: '2',
    name: 'Анна',
    age: 22,
    city: 'Москва',
    distance: 7,
    bio: 'Художник и любитель кино. Предпочитаю тихие вечера шумным вечеринкам. Люблю котов и хорошую еду 🎨',
    photos: [
      'https://cdn.poehali.dev/projects/9af0fc17-cee5-4084-8bef-c980d431deb0/files/b5310480-669e-4935-9dce-f7d16dd3c31a.jpg',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80',
    ],
    tags: ['Искусство', 'Кино', 'Коты', 'Кулинария'],
    job: 'Иллюстратор',
    height: 163,
    verified: false,
    online: false,
  },
  {
    id: '3',
    name: 'Алиса',
    age: 26,
    city: 'Москва',
    distance: 12,
    bio: 'Маркетолог днём, пекарь выходного дня. Бегаю по утрам и верю, что хороший круассан решает любые проблемы 🥐',
    photos: [
      'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=600&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
    ],
    tags: ['Спорт', 'Выпечка', 'Маркетинг', 'Музыка'],
    job: 'Маркетолог',
    education: 'ВШЭ',
    height: 172,
    verified: true,
    online: true,
  },
  {
    id: '4',
    name: 'Екатерина',
    age: 28,
    city: 'Москва',
    distance: 5,
    bio: 'Врач-педиатр. Обожаю горы, сноуборд и тёплые пледы. Ищу кого-то, кто составит компанию в горных вылазках 🏔️',
    photos: [
      'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=600&q=80',
    ],
    tags: ['Горы', 'Сноуборд', 'Медицина', 'Книги'],
    job: 'Врач',
    height: 165,
    verified: true,
    online: false,
  },
  {
    id: '5',
    name: 'Мария',
    age: 25,
    city: 'Москва',
    distance: 9,
    bio: 'Программист и любитель настолок. По выходным хожу в кино или на выставки. Ищу умного и доброго человека 🎲',
    photos: [
      'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=600&q=80',
    ],
    tags: ['Программирование', 'Настолки', 'Выставки', 'Кино'],
    job: 'Frontend разработчик',
    education: 'МФТИ',
    height: 170,
    verified: false,
    online: true,
  },
];

export interface Match {
  id: string;
  profile: Profile;
  matchedAt: Date;
  lastMessage?: string;
  lastTime?: Date;
  unread?: number;
}

export const matches: Match[] = [
  {
    id: 'm1',
    profile: profiles[0],
    matchedAt: new Date(Date.now() - 1000 * 60 * 10),
    lastMessage: 'Привет! Как дела? 😊',
    lastTime: new Date(Date.now() - 1000 * 60 * 10),
    unread: 2,
  },
  {
    id: 'm2',
    profile: profiles[2],
    matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    lastMessage: 'Круассаны уже готовы, приходи 🥐',
    lastTime: new Date(Date.now() - 1000 * 60 * 60 * 3),
    unread: 0,
  },
  {
    id: 'm3',
    profile: profiles[1],
    matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    lastMessage: undefined,
    lastTime: undefined,
    unread: 0,
  },
];
