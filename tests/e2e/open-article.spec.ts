import { test, expect } from '@playwright/test';

import article from './fixtures/article.json';

test('open article flow', async ({ page }) => {
  await page.route('**/api/article/1', (route) => {
    route.fulfill({ json: article });
  });

  await page.setContent(`
    <main id="app"></main>
    <script>
      fetch('/api/article/1').then(r => r.json()).then(d => {
        document.getElementById('app').innerHTML = '<h1>' + d.title + '</h1>' + d.content;
      });
    </script>
  `);

  await expect(page.locator('h1')).toHaveText(article.title);
  await expect(page.locator('p')).toHaveText('This is a test article.');
});
