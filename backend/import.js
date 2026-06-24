const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importModel(name, data, modelClient, upsertWhere = 'id') {
  if (!data || data.length === 0) {
    console.log(`  ⏭️  ${name.padEnd(20)} → 0 records (skipped)`);
    return 0;
  }

  let imported = 0;
  let skipped = 0;

  for (const record of data) {
    try {
      await modelClient.upsert({
        where: { [upsertWhere]: record[upsertWhere] },
        update: record,
        create: record,
      });
      imported++;
    } catch (err) {
      // Skip records that fail (likely due to missing foreign keys or constraints)
      skipped++;
    }
  }

  console.log(`  ✅ ${name.padEnd(20)} → ${imported} imported${skipped > 0 ? `, ${skipped} skipped` : ''}`);
  return imported;
}

async function main() {
  console.log("🚀 Kutangira kwinjiza data zose muri MySQL...");
  console.log("📅 Tariki: ", new Date().toISOString());

  // 1. Read the JSON backup file
  const backupFile = path.join(__dirname, 'aiven_database_backup.json');
  if (!fs.existsSync(backupFile)) {
    console.error("❌ File aiven_database_backup.json ntabwo ibonetse. Sobanura backup.js mbere.");
    process.exit(1);
  }

  const rawData = fs.readFileSync(backupFile, 'utf8');
  const backup = JSON.parse(rawData);

  // DISABLE Foreign key checks so order doesn't matter
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
  console.log("🔒 Foreign key checks zumvitse (temporary)...\n");

  let totalImported = 0;

  try {
    // Import order: Base entities first, then dependent entities
    console.log("📊 Gutangira gusoma kuri buri model...\n");

    // 1. Facilities (no dependencies)
    totalImported += await importModel('Facility', backup.facility, prisma.facility, 'id');

    // 2. Users (optional dependency on Facility)
    totalImported += await importModel('User', backup.user, prisma.user, 'id');

    // 3. Children (depends on Facility, User)
    totalImported += await importModel('Child', backup.child, prisma.child, 'id');

    // 4. Assessments (depends on Child, Facility, User)
    totalImported += await importModel('Assessment', backup.assessment, prisma.assessment, 'id');

    // 5. Follow-ups (depends on Child, Assessment, User)
    totalImported += await importModel('FollowUp', backup.followUp, prisma.followUp, 'id');

    // 6. Referrals (depends on Child, Assessment, Facility, User)
    totalImported += await importModel('Referral', backup.referral, prisma.referral, 'id');

    // 7. Growth Records (depends on Child)
    totalImported += await importModel('GrowthRecord', backup.growthRecord, prisma.growthRecord, 'id');

    // 8. Activities (depends on User, Facility - optional)
    totalImported += await importModel('Activity', backup.activity, prisma.activity, 'id');

    // 9. Facility Stats (depends on Facility)
    totalImported += await importModel('FacilityStats', backup.facilityStats, prisma.facilityStats, 'id');

    // 10. CHW Stats (depends on User)
    totalImported += await importModel('CHWStats', backup.chwStats, prisma.chwStats, 'id');

    // 11. Notifications (depends on User)
    totalImported += await importModel('Notification', backup.notification, prisma.notification, 'id');

    // 12. Conversations (depends on User)
    totalImported += await importModel('Conversation', backup.conversation, prisma.conversation, 'id');

    // 13. Messages (depends on Conversation, User)
    totalImported += await importModel('Message', backup.message, prisma.message, 'id');

  } catch (err) {
    console.error("\n⚠️  Ikosa mu mahoro y'inyandiko:", err.message);
  } finally {
    // RE-ENABLE Foreign key checks to keep the database healthy
    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
    console.log("\n🔓 Foreign key checks zitanzwe neza.");
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 IMPORT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`📊 Total records imported: ${totalImported}`);
  console.log(`📁 Source file: ${backupFile}`);
  console.log("=".repeat(60));
}

main()
  .catch(async (e) => {
    console.error("\n❌ CRITICAL ERROR:", e.message);
    // Make sure we re-enable checks even if it fails
    try {
      await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
    } catch (err) {
      // ignore
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
