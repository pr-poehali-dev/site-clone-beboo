export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  postsCount: number;
  verified?: boolean;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  images?: string[];
  video?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: Date;
  liked?: boolean;
  bookmarked?: boolean;
}

export interface Message {
  id: string;
  sender: User;
  text: string;
  timestamp: Date;
  read: boolean;
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: string;
  lastTime: Date;
  unread: number;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'share';
  user: User;
  text: string;
  timestamp: Date;
  read: boolean;
  postId?: string;
}
