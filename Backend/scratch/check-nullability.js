require('dotenv').config();
const postgres = require('postgres');

async function checkNullability() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  try {
    const columns = await sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `;
    console.log('Column nullability:', columns);

  } catch (err) {
    console.error('Error checking nullability:', err);
  } finally {
    await sql.end();
  }
}

checkNullability();
