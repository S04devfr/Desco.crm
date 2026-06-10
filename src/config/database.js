const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Database] Closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
