require('dotenv').config();
const db = require('../src/db');
const { users } = require('../src/db/schema');

async function checkUsers() {
  const allUsers = await db.select().from(users);
  console.log('Users in DB:', JSON.stringify(allUsers, null, 2));
  process.exit(0);
}

checkUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
