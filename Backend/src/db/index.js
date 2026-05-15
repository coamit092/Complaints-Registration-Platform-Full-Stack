require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('./schema');

// Provide a fallback for connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const client = postgres(connectionString, { ssl: 'require' });
const db = drizzle(client, { schema });

module.exports = db;
