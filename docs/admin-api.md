# Admin API Endpoints

The application exposes administrative endpoints under `/api/admin`. These routes verify the current user's role using the `app_metadata.roles` array stored with Supabase Auth. Requests from users without the required role return **403 Unauthorized**.

## View all profiles

`GET /api/admin/profiles`

Returns paginated profiles. Example:

```bash
curl -b "auth_token=YOUR_SESSION" \ 
  "https://yourdomain.com/api/admin/profiles?page=1&limit=50"
```

## Moderate comments

`GET /api/admin/comments?status=flagged`
: Fetch comments with the given status (defaults to `flagged`).

`PATCH /api/admin/comments`
: Update a comment's status.

Example request to approve a comment:

```bash
curl -X PATCH -b "auth_token=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"id":"COMMENT_ID","status":"active"}' \
  https://yourdomain.com/api/admin/comments
```

