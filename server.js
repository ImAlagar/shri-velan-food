import app from './src/app.js';
import { PORT, NODE_ENV } from './src/config/index.js';
import prisma from './src/config/database.js';

// Test database connection on startup
async function startServer() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection test passed');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`📚 API: http://localhost:${PORT}/api`);
      console.log(`❤️ Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.log('💡 Please ensure:');
    console.log('   1. Database is running and accessible');
    console.log('   2. DATABASE_URL environment variable is set correctly');
    console.log('   3. Prisma Client is generated (run: npx prisma generate)');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();