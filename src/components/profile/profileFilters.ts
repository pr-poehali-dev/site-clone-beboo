export const TAGS_OPTIONS = ['Спорт', 'Путешествия', 'Кофе', 'Музыка', 'Кино', 'Искусство', 'Книги', 'Горы', 'Танцы', 'Кулинария', 'Йога', 'Фото', 'Игры', 'Природа'];

// Запрещённые слова (соцсети, мессенджеры, маты)
const BANNED_WORDS = /\b(tg|vk|vк|тг|тгк|телег[а-я]*|телеграм[а-я]*|вконтакт[а-я]*|вк\b|инстаграм[а-я]*|инста\b|ватсап[а-я]*|вайбер[а-я]*|скайп[а-я]*|дискорд[а-я]*|twitter|facebook|whatsapp|viber|snapchat|тикток|tiktok|онлифанс|onlyfans|ссылка|написать\s+мне|пиши\s+мне|звони\s+мне|блядь|бляд[ьъ]|пизд[аеёиоуы]|хуй|хую|хуе|хуя|ебл|ёбл|ебан|нахуй|нахуе|пиздец|заебал|заёбал|ебать|ёбать|залупа|мудак|мудил|долбоёб|долбоеб|дебил|идиот|тупой|шлюх[аи]|проститутк[аи]|сука\b|гандон|пидор|пидар|гей\b|педик|лох\b|урод|чмо\b|ублюдок)\b/gi;

// Контакты: телефоны, @mentions, ссылки
const CONTACTS_REGEX = /(@[\w.]+|https?:\/\/|www\.|t\.me\/|vk\.com\/|instagram\.com\/|fb\.com\/|\+?[78]\s*[.(]?\s*\d{3}|whatsapp|telegram)/gi;

export const BIO_MAX = 600;
export const JOB_MAX = 60;

export function filterBio(value: string): { clean: string; error: string | null } {
  if (value.length > BIO_MAX) return { clean: value.slice(0, BIO_MAX), error: `Максимум ${BIO_MAX} символов` };
  if (/\d/.test(value)) return { clean: value, error: 'Цифры в описании запрещены' };
  if (BANNED_WORDS.test(value)) return { clean: value, error: 'Запрещённые слова или упоминания соцсетей/мессенджеров' };
  if (CONTACTS_REGEX.test(value)) return { clean: value, error: 'Контакты и ссылки запрещены — общайтесь только внутри приложения' };
  return { clean: value, error: null };
}

export function filterJob(value: string): { clean: string; error: string | null } {
  if (value.length > JOB_MAX) return { clean: value.slice(0, JOB_MAX), error: `Максимум ${JOB_MAX} символов` };
  if (BANNED_WORDS.test(value)) return { clean: value, error: 'Запрещённые слова' };
  if (CONTACTS_REGEX.test(value)) return { clean: value, error: 'Контакты запрещены' };
  if (/@/.test(value)) return { clean: value, error: 'Символ @ запрещён' };
  return { clean: value, error: null };
}
