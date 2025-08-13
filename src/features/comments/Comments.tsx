import CommentForm from './CommentForm';
import { listComments } from './actions';

export default async function Comments({ slug, articleId }: { slug: string; articleId: string }) {
  const comments = await listComments(articleId);
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4">Comments</h2>
      <ul className="space-y-4 mb-4">
        {comments.map((c) => (
          <li key={c.id} className="border p-2 rounded">
            {c.body}
          </li>
        ))}
      </ul>
      <CommentForm slug={slug} articleId={articleId} />
    </section>
  );
}
