import { test, expect } from '@playwright/test';

import response from './fixtures/bookmark.json';

test('bookmark flow', async ({ page }) => {
  await page.route('**/api/bookmark', (route) => {
    route.fulfill({ json: response });
  });

  await page.setContent(`
    <button id="bookmark">Bookmark</button>
    <div id="status"></div>
    <script>
      document.getElementById('bookmark').addEventListener('click', async () => {
        const res = await fetch('/api/bookmark', { method: 'POST', body: JSON.stringify({ id: 1 }) });
        const data = await res.json();
        document.getElementById('status').textContent = data.success ? 'Bookmarked' : 'Failed';
      });
    </script>
  `);

  await page.click('#bookmark');
  await expect(page.locator('#status')).toHaveText('Bookmarked');
});
