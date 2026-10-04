require("dotenv").config();
const argon2 = require("argon2");
const { eq, asc } = require("drizzle-orm");
const { db, initDb } = require("./index");
const { admins } = require("./schema");

/**
 * Synchronizes the database administrator account credentials
 * with the ADMIN_DEFAULT_EMAIL and ADMIN_DEFAULT_PASSWORD defined in .env.
 * 
 * - Preserves existing admin ID and references (foreign keys).
 * - Hashes password using Argon2id before storing in the database.
 * - Never logs or stores plaintext passwords.
 * - Does not create duplicate admin accounts.
 */
async function syncAdminCredentials() {
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || "").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  const adminName = (process.env.ADMIN_DEFAULT_NAME || "Administrator").trim();

  if (!adminEmail) {
    throw new Error("[AdminSync Error] ADMIN_DEFAULT_EMAIL is missing or empty in .env.");
  }

  if (!adminPassword || adminPassword.trim().length === 0) {
    throw new Error("[AdminSync Error] ADMIN_DEFAULT_PASSWORD is missing or empty in .env.");
  }

  await initDb();

  // 1. Identify existing admin account
  // First attempt: check for account matching the target email
  let existingAdmin = (await db.select().from(admins).where(eq(admins.email, adminEmail)))[0];

  // Second attempt: if email was changed in .env, locate the primary existing admin record
  if (!existingAdmin) {
    const allAdmins = await db.select().from(admins).orderBy(asc(admins.id)).limit(1);
    if (allAdmins.length > 0) {
      existingAdmin = allAdmins[0];
    }
  }

  // 2. Generate secure Argon2id hash
  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id
  });

  if (existingAdmin) {
    // 3. Update existing admin record in-place
    await db
      .update(admins)
      .set({
        email: adminEmail,
        password_hash: passwordHash,
        name: adminName || existingAdmin.name,
        is_active: true,
        updated_at: new Date()
      })
      .where(eq(admins.id, existingAdmin.id));

    console.log(`[AdminSync] Successfully synchronized admin account (ID: ${existingAdmin.id}, Email: ${adminEmail}).`);
  } else {
    // 4. Create new admin if database has no existing admin records
    const inserted = await db.insert(admins).values({
      email: adminEmail,
      password_hash: passwordHash,
      name: adminName,
      role: "admin",
      is_active: true
    }).returning();

    console.log(`[AdminSync] Created initial admin account (ID: ${inserted[0].id}, Email: ${adminEmail}).`);
  }
}

if (require.main === module) {
  syncAdminCredentials()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("[AdminSync Error]", err.message || err);
      process.exit(1);
    });
}

module.exports = { syncAdminCredentials };
