import { DATABASE_URL } from '$env/static/private';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: DATABASE_URL
});
