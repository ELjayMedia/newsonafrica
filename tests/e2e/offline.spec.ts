import { test, expect } from '@playwright/test';

import article from './fixtures/article.json';

test('offline read flow', async ({ browser }) => {
  const context = await browser.newContext();
  await context.route('**/api/article/1', (route) => {
    route.fulfill({ json: article });
  });
  const page = await context.newPage();

  await page.setContent(`
    <script>
      async function load() {
        try {
          const res = await fetch('/api/article/1');
          const data = await res.json();
          document.body.innerHTML = '<h1>' + data.title + '</h1>' + data.content;
          localStorage.setItem('cached', JSON.stringify(data));
        } catch (e) {
          const cached = JSON.parse(localStorage.getItem('cached'));
          document.body.innerHTML = '<h1>' + cached.title + '</h1>' + cached.content;
        }
      }
      load();
    </script>
  `);

  await expect(page.locator('h1')).toHaveText(article.title);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveText(article.title);
  await context.close();
});
