const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Kutubura data zose z'ama-tables yose kuri Aiven MySQL...");
  console.log("📅 Umwaka: ", new Date().toISOString());

  // All models from schema.prisma (Updated 2026-06-23)
  const modelsMap = {
    facility: 'Facility',
    user: 'User',
    child: 'Child',
    assessment: 'Assessment',
    followUp: 'FollowUp',
    referral: 'Referral',
    growthRecord: 'GrowthRecord',
    activity: 'Activity',
    facilityStats: 'FacilityStats',
    chwStats: 'CHWStats',
    notification: 'Notification',
    conversation: 'Conversation',
    message: 'Message'
  };

  const allData = {};
  let successCount = 0;
  let errorCount = 0;

  console.log("\n📊 Gutangira gusoma buri Table...\n");
  
  for (const [key, modelName] of Object.entries(modelsMap)) {
    let data = [];

    if (prisma[modelName] && typeof prisma[modelName].findMany === 'function') {
      try {
        data = await prisma[modelName].findMany({
          include: undefined // Load full relationships where possible
        });
        console.log(`  ✅ ${modelName.padEnd(20)} → ${data.length.toString().padStart(5)} records`);
        successCount++;
      } catch (err) {
        console.log(`  ⚠️  ${modelName.padEnd(20)} → ERROR: ${err.message}`);
        errorCount++;
        data = [];
      }
    } else {
      console.log(`  ❌ ${modelName.padEnd(20)} → Model not found in Prisma Client`);
      errorCount++;
    }

    allData[key] = data;
  }

  // Generate backup file with timestamp
  const backupDir = path.dirname(__filename);
  const backupFile = path.join(backupDir, 'aiven_database_backup.json');
  
  fs.writeFileSync(backupFile, JSON.stringify(allData, null, 2));
  
  const stats = fs.statSync(backupFile);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 BACKUP COMPLETE!");
  console.log("=".repeat(60));
  console.log(`📁 File: ${backupFile}`);
  console.log(`💾 Size: ${fileSizeKB} KB`);
  console.log(`✅ Success: ${successCount}/${Object.keys(modelsMap).length} tables`);
  if (errorCount > 0) {
    console.log(`⚠️  Errors: ${errorCount}`);
  }
  console.log("=".repeat(60));
}

main()
  .catch(e => {
    console.error("\n❌ CRITICAL ERROR:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
