... existing code from start to line 70 ...

#### Service Mode (Server-Side Only)

\`\`\`http
POST /rest/v1/app_write_events HTTP/1.1
Host: {PROJECT_REF}.supabase.co
apikey: {SERVICE_ROLE_KEY}
Authorization: Bearer {SERVICE_ROLE_KEY}
Content-Type: application/json
\`\`\`

- `apikey` — MUST be the service role key (`SUPABASE_SERVICE_ROLE_KEY`) for canonical correctness
- `Authorization` — MUST be the service role key (`SUPABASE_SERVICE_ROLE_KEY`)
- **MUST NOT** be used from browser code under any circumstances
- **MUST** only be used in:
  - Next.js API routes
  - Server Actions
  - Background jobs

... existing code to line 90 ...

| **Service** | service role key | RLS bypassed | Admin ops, counters, blocked passwords |

... existing code to line 136 ...

**List user's bookmarks (with filter, order, limit):**
\`\`\`bash
curl -X GET \
  'https://{PROJECT_REF}.supabase.co/rest/v1/bookmarks?edition=eq.sz&order=created_at.desc&limit=20&select=id,post_id,post_slug,post_title,collection_id,created_at' \
  -H 'apikey: {ANON_KEY}' \
  -H 'Authorization: Bearer {ACCESS_TOKEN}'
\`\`\`

... existing code to line 162 ...

  -d '{"post_id": 12345, "post_slug": "article-slug", "post_title": "Article Title", "edition": "sz"}'
\`\`\`

**Delete bookmark:**
\`\`\`bash
curl -X DELETE \
  'https://{PROJECT_REF}.supabase.co/rest/v1/bookmarks?id=eq.{UUID}' \
  -H 'apikey: {ANON_KEY}' \
  -H 'Authorization: Bearer {ACCESS_TOKEN}'
\`\`\`

#### Canonical Query Patterns

All GETs MUST specify `select=` to control payload size and prevent accidental inclusion of large text columns.

\`\`\`
?edition=eq.{edition}&order=created_at.desc&limit=20&select=id,post_id,post_slug,post_title,collection_id,created_at
?post_id=eq.{post_id}&select=id,post_id,post_slug,post_title,post_thumbnail
?collection_id=eq.{collection_id}&order=created_at.desc&limit=50&select=id,post_id,post_slug,created_at
?id=eq.{uuid}&select=*
\`\`\`

... existing code to line 227 ...

**List collections:**
\`\`\`bash
curl -X GET \
  'https://{PROJECT_REF}.supabase.co/rest/v1/bookmark_collections?order=created_at.desc&limit=20&select=id,name,description,created_at,updated_at' \
  -H 'apikey: {ANON_KEY}' \
  -H 'Authorization: Bearer {ACCESS_TOKEN}'
\`\`\`

... existing code to line 753 ...

### Public Read (All Authenticated Users)

\`\`\`sql
CREATE POLICY "authenticated_select" ON {table}
  FOR SELECT
  TO authenticated
  USING (true);
\`\`\`

Note: If you truly mean public/anon reads (unauthenticated), use `TO anon, authenticated` instead.

### Service-Only Status Updates

\`\`\`sql
CREATE POLICY "service_updates_status" ON comments
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
\`\`\`

Note: This is a "server bypass" pattern, not a "moderator" pattern. If you want actual moderator users (JWT-based), use:

\`\`\`sql
CREATE POLICY "moderator_update_status" ON comments
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'user_role' = 'moderator')
  WITH CHECK (auth.jwt() ->> 'user_role' = 'moderator');
\`\`\`

... existing code to line 835 ...

- [ ] Pagination includes `limit` parameter
- [ ] All GETs include `select=` parameter (never use `select=*` unless necessary)
- [ ] Service mode queries use `apikey: {SERVICE_ROLE_KEY}` (not anon key)
- [ ] Database schema aligns with contract naming (post_id, edition, content, etc.)
- [ ] RLS policies use correct role: `authenticated` or `service_role` (not mislabeled)

... existing code to line 859 ...

\`\`\`bash
curl -X GET \
  'https://{PROJECT_REF}.supabase.co/rest/v1/bookmarks?edition=eq.sz&order=created_at.desc&limit=20&offset=0&select=id,post_id,post_slug,post_title,collection_id,created_at' \
  -H 'apikey: {ANON_KEY}' \
  -H 'Authorization: Bearer {ACCESS_TOKEN}'
\`\`\`

... existing code to end ...
