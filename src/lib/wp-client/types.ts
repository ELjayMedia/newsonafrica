export type WPImage = { src: string; alt?: string; width?: number; height?: number };
export type WPAuthor = { id: number; name: string };
export type WPPost = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  date: string;
  modified?: string;
  featured_image?: WPImage;
  author?: WPAuthor;
  categories?: number[];
};
export type WPCategory = { id: number; name: string; slug: string };
