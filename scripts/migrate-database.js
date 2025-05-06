#!/usr/bin/env node

/**
 * Database migration script
 * 
 * This script helps manage database migrations. It's useful for:
 * 1. Creating a new migration
 * 2. Running pending migrations
 * 3. Rolling back migrations (resetting the database)
 * 
 * Usage:
 *   node scripts/migrate-database.js create "Add user preferences table"
 *   node scripts/migrate-database.js deploy
 *   node scripts/migrate-database.js reset (caution: deletes all data)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const name = args[1];

async function runCommand(cmd) {
  try {
    console.log(`Executing: ${cmd}`);
    const { stdout, stderr } = await execAsync(cmd);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    return false;
  }
}

async function main() {
  switch (command) {
    case 'create':
      if (!name) {
        console.error('Please provide a name for the migration');
        process.exit(1);
      }
      await runCommand(`npx prisma migrate dev --name "${name}"`);
      break;
    
    case 'deploy':
      await runCommand('npx prisma generate');
      await runCommand('npx prisma migrate deploy');
      break;
    
    case 'reset':
      console.log('WARNING: This will delete all data in the database. Are you sure?');
      console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await runCommand('npx prisma migrate reset --force');
      break;
    
    case 'studio':
      await runCommand('npx prisma studio');
      break;
    
    default:
      console.log('Available commands:');
      console.log('  create "Migration name" - Create a new migration');
      console.log('  deploy - Apply pending migrations to the database');
      console.log('  reset - Reset the database (CAUTION: deletes all data)');
      console.log('  studio - Open Prisma Studio to browse data');
      break;
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 