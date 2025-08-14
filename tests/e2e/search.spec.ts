import { test, expect } from '@playwright/test';

import results from './fixtures/search.json';

test('search flow', async ({ page }) => {
  await page.route('**/api/search**', (route) => {
    route.fulfill({ json: results });
  });

  await page.setContent(`
    <input id="q" />
    <button id="search">Search</button>
    <ul id="results"></ul>
    <script>
      document.getElementById('search').addEventListener('click', async () => {
        const q = document.getElementById('q').value;
        const res = await fetch('/api/search?q=' + q);
        const data = await res.json();
        document.getElementById('results').innerHTML = data.results.map(r => '<li>' + r.title + '</li>').join('');
      });
    </script>
  `);

  await page.fill('#q', 'test');
  await page.click('#search');
  await expect(page.locator('#results li')).toHaveText(results.results[0].title);
});
