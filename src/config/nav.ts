export interface NavItem {
  title: string;
  href: string;
  items?: { title: string; href: string }[];
}

export const navConfig: NavItem[] = [
  { title: 'News', href: '/category/news' },
  { title: 'Business', href: '/category/business' },
  { title: 'Sport', href: '/category/sport' },
  { title: 'Entertainment', href: '/category/entertainment' },
  { title: 'Life', href: '/category/lifestyle' },
];

export type { NavItem };
