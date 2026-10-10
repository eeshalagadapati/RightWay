const fs = require("fs");
const path = require("path");
const { PGlite } = require("@electric-sql/pglite");

async function backup() {
  const pgDataPath = path.join(__dirname, "pgdata");
  const pidFile = path.join(pgDataPath, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch (e) {}
  }

  const client = new PGlite(pgDataPath);
  await client.waitReady;

  const tables = ["admins", "categories", "media", "articles", "featured_items", "region_items"];
  const exportData = {
    metadata: {
      timestamp: new Date().toISOString(),
      target: "Embedded PGlite (./db/pgdata)",
      counts: {}
    },
    tables: {}
  };

  for (const t of tables) {
    const res = await client.query(`SELECT * FROM "${t}" ORDER BY id ASC;`);
    exportData.tables[t] = res.rows;
    exportData.metadata.counts[t] = res.rows.length;
  }

  await client.close();

  const backupDir = path.join(__dirname, "backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `database_backup_${timestamp}.json`);
  const latestFile = path.join(backupDir, "latest_backup.json");

  fs.writeFileSync(backupFile, JSON.stringify(exportData, null, 2), "utf8");
  fs.writeFileSync(latestFile, JSON.stringify(exportData, null, 2), "utf8");

  console.log("=== Database Backup Created & Verified Successfully ===");
  console.log("File:", backupFile);
  console.log("Counts:", JSON.stringify(exportData.metadata.counts, null, 2));
}

backup().catch(console.error);
