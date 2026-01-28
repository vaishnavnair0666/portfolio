import { env } from '$env/dynamic/private';
import { Pool } from 'pg';
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5000
});
