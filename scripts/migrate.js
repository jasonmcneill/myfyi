const fs = require("fs");
const path = require("path");
const pool = require("../app/config/db");
require("dotenv").config();

async function runMigrations() {
  const migrationDir = path.join(__dirname, "../migrations");
  const files = fs
    .readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration(s)`);

  try {
    const connection = await pool.getConnection();

    for (const file of files) {
      const filePath = path.join(migrationDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`Running migration: ${file}`);
      await connection.query(sql);
      console.log(`✓ ${file} completed`);
    }

    await connection.release();
    console.log("\n✓ All migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error.message);
    process.exit(1);
  }
}

runMigrations();
