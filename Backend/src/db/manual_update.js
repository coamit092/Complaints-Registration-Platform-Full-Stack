require('dotenv').config();
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function update() {
  try {
    console.log('Updating existing users with placeholder passwords...');
    await sql`UPDATE users SET password = 'CHANGE_ME' WHERE password IS NULL;`;
    
    console.log('Applying NOT NULL constraint and DEFAULT value...');
    await sql`ALTER TABLE users ALTER COLUMN password SET NOT NULL;`;
    await sql`ALTER TABLE users ALTER COLUMN is_verified SET DEFAULT true;`;
    
    console.log('Update successful!');
  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    await sql.end();
  }
}

update();
