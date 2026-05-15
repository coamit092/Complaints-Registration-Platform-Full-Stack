require('dotenv').config();
const postgres = require('postgres');

async function testRawInsert() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  try {
    await sql`
      INSERT INTO users (name, email, otp, otp_expiry, is_verified) 
      VALUES ('Test', ${'test' + Date.now() + '@example.com'}, '123456', now(), false)
    `;
    console.log('Insert success');
  } catch (err) {
    console.error('RAW Insert failed!');
    console.error(err);
  } finally {
    await sql.end();
  }
}

testRawInsert();
