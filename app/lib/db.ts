import { Pool } from 'pg';

const connectionString = 'postgresql://retool:npg_YmgXEBdsw6H7@ep-solitary-pond-aktqtl10-pooler.c-3.us-west-2.retooldb.com/retool?sslmode=require';

const pool = new Pool({
  connectionString,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
