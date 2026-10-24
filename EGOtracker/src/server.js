const { PrismaClient } = require('@prisma/client');
const { createApp } = require('./app');

const prisma = new PrismaClient();
const app = createApp({ prisma });
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`EGOtracker is running at http://localhost:${port}`);
});

async function shutdown() {
  server.close(async (error) => {
    if (error) {
      console.error('Failed to close the HTTP server cleanly:', error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
