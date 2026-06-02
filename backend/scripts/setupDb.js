// Run: node scripts/setupDb.js
// This script creates the DB, user, and tables automatically
const { exec } = require('child_process');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr || err.message);
      else resolve(stdout.trim());
    });
  });
}

async function setup() {
  console.log('\n🔧  Setting up TalentAI database...\n');

  try {
    // Create user
    await run(`psql -h ${DB_HOST} -p ${DB_PORT} -U postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || true`);
    console.log(`✅  User '${DB_USER}' ready`);

    // Create database
    await run(`psql -h ${DB_HOST} -p ${DB_PORT} -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true`);
    console.log(`✅  Database '${DB_NAME}' ready`);

    // Run schema
    const schemaPath = path.join(__dirname, '../schema.sql');
    const result = await run(
      `PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${schemaPath}`
    );
    console.log('✅  Tables created and seed data inserted');
    console.log('\n🎉  Database setup complete! You can now run: npm start\n');
  } catch (err) {
    console.error('\n❌  Setup failed:', err);
    console.log('\n💡  Try running manually:');
    console.log(`    psql -U postgres -f schema.sql\n`);
  }
}

setup();
