const { pgTable, serial, varchar, text, timestamp, boolean, integer } = require('drizzle-orm/pg-core');

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(), 
  role: varchar('role', { length: 50 }).default('user'),
  otp: varchar('otp', { length: 10 }),
  otp_expiry: timestamp('otp_expiry'),
  is_verified: boolean('is_verified').default(true),
  created_at: timestamp('created_at').defaultNow(),
});

const complaints = pgTable('complaints', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  complaint_text: text('complaint_text').notNull(),
  ai_question: text('ai_question'),
  user_answer: text('user_answer'),
  created_at: timestamp('created_at').defaultNow(),
});

module.exports = { users, complaints };
