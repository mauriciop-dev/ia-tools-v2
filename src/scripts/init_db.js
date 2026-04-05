import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Connection string from Supabase
const connectionString = "postgresql://postgres.nuwjbcghvjpvzueevhql:[M4ur1c10+P1n3d4]@aws-0-us-west-2.pooler.supabase.com:5432/postgres";

async function initDB() {
  const client = new Client({
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.nuwjbcghvjpvzueevhql',
    password: '[M4ur1c10+P1n3d4]',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Conectando a Supabase...");
    await client.connect();
    console.log("Conectado exitosamente.");

    const schemaPath = path.resolve("./supabase/schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log("Aplicando schema...");
    await client.query(schemaSql);
    console.log("Schema aplicado con éxito.");

  } catch (err) {
    console.error("Error inicializando la base de datos:", JSON.stringify(err, null, 2));
  } finally {
    await client.end();
  }
}

initDB();
