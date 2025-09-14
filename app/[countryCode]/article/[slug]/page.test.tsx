import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/wp-data', () => ({
  getPostBySlug: vi.fn(),
}));

vi.mock('./ArticleClientContent', () => ({
  ArticleClientContent: ({ initialData }: { initialData: any }) => (
    <div>{initialData.title}</div>
  ),
}));

import Page from './page';
import { getPostBySlug } from '@/lib/wp-data';

describe('ArticlePage', () => {
  it('renders post content', async () => {
    vi.mocked(getPostBySlug).mockResolvedValue({ title: 'Hello', slug: 'test' });
    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } });
    render(ui);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(getPostBySlug).toHaveBeenCalledWith('SZ', 'test');
  });
});
