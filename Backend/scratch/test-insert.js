require('dotenv').config();
const db = require('../src/db');
const { users } = require('../src/db/schema');

async function testInsert() {
  try {
    const res = await db.insert(users).values({
      name: 'Test User',
      email: 'test' + Date.now() + '@example.com',
      otp: '123456',
      otp_expiry: new Date(Date.now() + 10000),
      is_verified: false
    }).returning();
    console.log('Insert success:', res);
  } catch (err) {
    console.error('Insert failed!');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error detail:', err.detail);
    console.error('Error code:', err.code);
  }
  process.exit(0);
}

testInsert();
