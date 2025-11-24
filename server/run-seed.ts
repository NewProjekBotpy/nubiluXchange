import { seedDatabase } from './seed.ts';
import { logError, logInfo } from './utils/logger';

async function runSeed() {
  try {
    await seedDatabase();
    logInfo('Database seeded successfully', { context: 'runSeed' });
  } catch (error) {
    logError('Error seeding database', { error, context: 'runSeed' });
  }
}

runSeed();