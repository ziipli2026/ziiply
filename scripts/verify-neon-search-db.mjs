#!/usr/bin/env node
// Read-only preflight. Never print the connection URL or credentials.
import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw Error('DATABASE_URL missing');
try {
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql`SELECT current_database() AS database, current_schema() AS schema_name,
    to_regclass('ziiply_ean_products')::text AS search_table,
    to_regclass('public.ziiply_ean_products')::text AS public_search_table`;
  const row=rows[0];
  console.log('DB name:',row.database,'schema:',row.schema_name);
  console.log('Unqualified search table:',row.search_table||'NOT FOUND');
  console.log('Public search table:',row.public_search_table||'NOT FOUND');
  if(!row.search_table) {
    console.error('::error::Connected Neon database lacks ziiply_ean_products. Configure a separate GitHub secret for the actual Ziiply EAN catalog DB; no schema changes performed.');
    process.exit(1);
  }
} catch(error) { console.error('::error::Neon preflight failed:',error.code||error.name);process.exit(1); }
