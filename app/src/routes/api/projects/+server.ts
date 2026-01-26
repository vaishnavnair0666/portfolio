import { json, error } from '@sveltejs/kit';
import { pool } from '$lib/db';
import { ADMIN_TOKEN } from '$env/static/private';
import type { RequestHandler } from './$types';

function requireAdmin(request: Request) {
  const token = request.headers.get('authorization');

  if (!token || token !== `Bearer ${ADMIN_TOKEN}`) {
    throw error(401, 'Unauthorized');
  }
}

export async function GET() {
  const result = await pool.query(
    'SELECT id, title, summary, tags FROM projects ORDER BY title'
  );

  return json(result.rows);
}

export const POST: RequestHandler = async ({ request }) => {
  requireAdmin(request);

  const body = await request.json();
  const { id, title, summary, tags } = body;

  if (!id || !title || !summary || !Array.isArray(tags)) {
    throw error(400, 'Invalid payload');
  }

  await pool.query(
    `
    INSERT INTO projects (id, title, summary, tags)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id)
    DO UPDATE SET
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      tags = EXCLUDED.tags
    `,
    [id, title, summary, tags]
  );

  return json({ ok: true });
};
