export type Category = 'Tops' | 'Bottoms' | 'Shoes' | 'Accessories' | 'Dresses' | 'Outerwear';

export interface ClosetItem {
  id: string;
  name: string;
  category: Category;
  imageUrl: string;
  color?: string;
  tags?: string[];
  lastWorn?: string;
}

export interface Outfit {
  id: string;
  name: string;
  items: ClosetItem[];
  description?: string;
  occasion?: string;
  mood?: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  outfitName: string;
  imageUrls: string[];
  likes: number;
  description: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isPinned: boolean;
  author: string;
}
