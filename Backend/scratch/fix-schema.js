require('dotenv').config();
const postgres = require('postgres');

async function fixSchema() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  try {
    console.log('Altering columns to be nullable...');
    await sql`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`;
    await sql`ALTER TABLE users ALTER COLUMN role DROP NOT NULL`;
    console.log('Schema fixed successfully!');
  } catch (err) {
    console.error('Failed to fix schema:', err);
  } finally {
    await sql.end();
  }
}

fixSchema();
