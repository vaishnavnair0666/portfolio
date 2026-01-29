import { pool } from '$lib/db';

export async function load() {
  const result = await pool.query(
    'SELECT id, title, summary, tags FROM projects ORDER BY title'
  );
  return { projects: result.rows };
}
