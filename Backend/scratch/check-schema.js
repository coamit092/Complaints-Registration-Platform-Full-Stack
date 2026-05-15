require('dotenv').config();
const postgres = require('postgres');

async function checkSchema() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  try {
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `;
    console.log('Columns in users table:', columns.map(c => c.column_name));
    
    const complaintsColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'complaints'
    `;
    console.log('Columns in complaints table:', complaintsColumns.map(c => c.column_name));

  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await sql.end();
  }
}

checkSchema();
