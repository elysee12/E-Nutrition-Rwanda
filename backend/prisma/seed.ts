/**
 * E-Nutrition Rwanda - Database Seed Script
 * 
 * This script populates the database with initial data for development and testing.
 * 
 * Run with: npx prisma db seed
 */

import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  console.log('👤 Seeding admin user...');

  const hashedPassword = await bcrypt.hash('Telysee2002@', 10);

  const adminUser = await prisma.user.create({
    data: {
      code: 'U-001',
      name: 'Ezi Admin',
      email: 'ezi@moh.gov.rw',
      password: hashedPassword,
      phone: '+250 788 000 001',
      role: UserRole.ADMIN,
      status: UserStatus.Active,
    },
  });

  console.log('✅ Created admin user');
  console.log('\n🔐 Login Credentials:');
  console.log(`   Admin: ${adminUser.email} / password123`);
  console.log('\n🌍 E-Nutrition Rwanda seed complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
