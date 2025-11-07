import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger from './src/utils/logger.js';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting admin user seed...');

  // Admin credentials from environment
  const adminEmail = process.env.ADMIN_EMAIL || 'alagar17302@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'SuperAdmin@123';

  // Validate required environment variables
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    logger.warn('⚠️  Using default admin credentials. For production, set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
  }

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      logger.info('ℹ️  Admin user already exists');
      logger.info(`📧 Email: ${adminEmail}`);
      logger.info('👤 Role: ADMIN');
      logger.info('🆔 User ID: ' + existingAdmin.id);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'ADMIN',
        emailVerified: new Date(),
        isActive: true
      }
    });
    
    // Log success (without password)
    logger.info('✅ Admin user created successfully!');
    logger.info(`🆔 User ID: ${adminUser.id}`);
    logger.info(`📧 Email: ${adminEmail}`);
    logger.info(`👤 Name: ${adminUser.name}`);
    logger.info(`🎯 Role: ${adminUser.role}`);
    logger.info('📅 Created: ' + adminUser.createdAt.toISOString());

    // Security recommendations
    if (adminPassword === 'SuperAdmin@123') {
      logger.warn('⚠️  SECURITY: Using default password. Please change immediately after login.');
    }
    
    logger.info('🔐 Password: ' + (process.env.ADMIN_PASSWORD ? 'Set via environment variable' : 'Using default'));

  } catch (error) {
    logger.error('❌ Failed to create admin user:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    throw error;
  }
}

// Execute seed
main()
  .then(() => {
    logger.info('🎉 Admin seed completed successfully!');
  })
  .catch((error) => {
    logger.error('💥 Admin seed process failed:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
      logger.debug('🔌 Database connection closed');
    } catch (error) {
      logger.error('❌ Error disconnecting from database:', error);
    }
  });