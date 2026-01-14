/**
 * Migration Script: Convert Driver IDs to 7 Brothers Format
 * 
 * This script migrates all existing driver_id values from numeric format (e.g., "0001", "0002")
 * to 7 Brothers format (e.g., "7B001", "7B002").
 * 
 * Usage:
 *   node scripts/migrate-driver-ids-to-7b.js [--dry-run] [--start-from=N]
 * 
 * Options:
 *   --dry-run: Preview changes without updating database
 *   --start-from=N: Start migration from driver_id number N (useful for resuming)
 */

require('dotenv').config();
const knex = require('../src/utils/knex');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const START_FROM_ARG = process.argv.find(arg => arg.startsWith('--start-from='));
const START_FROM = START_FROM_ARG ? parseInt(START_FROM_ARG.split('=')[1]) : null;

// Debug database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL not found in environment variables');
  console.error('   Please check your .env file');
  process.exit(1);
}

// Mask password in URL for logging
const maskedUrl = databaseUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
console.log(`Database: ${maskedUrl}\n`);

/**
 * Convert numeric driver_id to 7B format
 * @param {string} oldDriverId - Old driver_id (e.g., "0001", "0002")
 * @returns {string} - New driver_id in 7B format (e.g., "7B001", "7B002")
 */
function convertTo7BFormat(oldDriverId) {
  // Remove leading zeros and get the numeric value
  const numericValue = parseInt(oldDriverId, 10);
  
  // Convert to 7B format with 3 digits
  return `7B${numericValue.toString().padStart(3, '0')}`;
}

/**
 * Main migration function
 */
async function migrateDriverIds() {
  try {
    console.log('='.repeat(60));
    console.log('Driver ID Migration Script - Convert to 7B Format');
    console.log('='.repeat(60));
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}`);
    if (START_FROM) {
      console.log(`Starting from driver_id number: ${START_FROM}`);
    }
    console.log('');

    // Test database connection
    console.log('Testing database connection...');
    try {
      await knex.raw('SELECT 1');
      console.log('✅ Database connection successful\n');
    } catch (dbError) {
      console.error('❌ Database connection failed:');
      console.error(`   ${dbError.message}`);
      console.error('\nPlease check:');
      console.error('   1. DATABASE_URL is correct in your .env file');
      console.error('   2. Database server is accessible from your network');
      console.error('   3. Database credentials are correct');
      console.error('   4. Firewall/security groups allow your IP address\n');
      throw dbError;
    }

    // Step 1: Fetch all drivers with numeric driver_id (not starting with "7B")
    console.log('Step 1: Fetching drivers with numeric driver_id...');
    let query = knex('drivers')
      .whereRaw("driver_id NOT LIKE '7B%'")
      .whereNotNull('driver_id')
      .orderBy('driver_id', 'asc');

    if (START_FROM) {
      // Filter to start from a specific numeric value
      query = query.whereRaw(`CAST(driver_id AS INTEGER) >= ?`, [START_FROM]);
    }

    const drivers = await query.select('id', 'driver_id', 'name', 'phone');

    if (drivers.length === 0) {
      console.log('✅ No drivers found to migrate.');
      console.log('   All drivers already have 7B format or no numeric driver_ids exist.');
      process.exit(0);
    }

    console.log(`Found ${drivers.length} driver(s) to migrate.\n`);

    // Step 2: Validate and prepare migration data
    console.log('Step 2: Preparing migration data...');
    const migrations = [];
    const errors = [];

    for (const driver of drivers) {
      const oldDriverId = driver.driver_id;
      
      // Skip if already in 7B format (shouldn't happen due to query, but safety check)
      if (oldDriverId.startsWith('7B')) {
        console.log(`⚠️  Skipping ${driver.name} (${oldDriverId}) - already in 7B format`);
        continue;
      }

      // Validate that driver_id is numeric
      const numericValue = parseInt(oldDriverId, 10);
      if (isNaN(numericValue)) {
        errors.push({
          driver: driver.name,
          oldDriverId: oldDriverId,
          error: 'Driver ID is not numeric'
        });
        continue;
      }

      // Convert to 7B format
      const newDriverId = convertTo7BFormat(oldDriverId);

      // Check if new driver_id already exists
      const existing = await knex('drivers')
        .where('driver_id', newDriverId)
        .where('id', '!=', driver.id)
        .first();

      if (existing) {
        errors.push({
          driver: driver.name,
          oldDriverId: oldDriverId,
          newDriverId: newDriverId,
          error: `Target driver_id ${newDriverId} already exists (used by ${existing.name})`
        });
        continue;
      }

      migrations.push({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        oldDriverId: oldDriverId,
        newDriverId: newDriverId
      });
    }

    // Step 3: Display preview
    console.log('\nStep 3: Migration Preview\n');
    console.log('Drivers to be migrated:');
    console.log('-'.repeat(60));
    console.log('ID'.padEnd(38) + 'Name'.padEnd(20) + 'Old ID'.padEnd(10) + 'New ID');
    console.log('-'.repeat(60));

    migrations.forEach((migration, index) => {
      console.log(
        `${migration.id.substring(0, 36)}...  ${migration.name.padEnd(20)} ${migration.oldDriverId.padEnd(10)} ${migration.newDriverId}`
      );
    });

    if (errors.length > 0) {
      console.log('\n⚠️  Errors/Warnings:');
      console.log('-'.repeat(60));
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.driver} (${error.oldDriverId}): ${error.error}`);
      });
    }

    console.log(`\nTotal: ${migrations.length} driver(s) will be migrated`);
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length} driver(s) skipped`);
    }

    // Step 4: Confirm and execute
    if (DRY_RUN) {
      console.log('\n✅ DRY RUN complete. No changes were made.');
      console.log('   Run without --dry-run to apply changes.');
    } else {
      console.log('\nStep 4: Executing migration...');
      
      let successCount = 0;
      let failCount = 0;

      // Use transaction for safety
      await knex.transaction(async (trx) => {
        for (const migration of migrations) {
          try {
            await trx('drivers')
              .where('id', migration.id)
              .update({
                driver_id: migration.newDriverId,
                updated_at: new Date()
              });

            console.log(`✅ ${migration.name}: ${migration.oldDriverId} → ${migration.newDriverId}`);
            successCount++;
          } catch (error) {
            console.error(`❌ ${migration.name}: Failed to update - ${error.message}`);
            failCount++;
            // Continue with other migrations
          }
        }
      });

      console.log('\n' + '='.repeat(60));
      console.log('Migration Summary:');
      console.log(`✅ Successfully migrated: ${successCount} driver(s)`);
      if (failCount > 0) {
        console.log(`❌ Failed: ${failCount} driver(s)`);
      }
      console.log('='.repeat(60));
    }

    // Step 5: Verification
    if (!DRY_RUN && migrations.length > 0) {
      console.log('\nStep 5: Verifying migration...');
      const verifyQuery = knex('drivers')
        .whereIn('id', migrations.map(m => m.id))
        .select('id', 'driver_id', 'name');

      const verified = await verifyQuery;
      const allCorrect = verified.every(driver => {
        const migration = migrations.find(m => m.id === driver.id);
        return migration && driver.driver_id === migration.newDriverId;
      });

      if (allCorrect) {
        console.log('✅ Verification passed: All driver IDs updated correctly.');
      } else {
        console.log('⚠️  Verification warning: Some driver IDs may not have been updated correctly.');
        verified.forEach(driver => {
          const migration = migrations.find(m => m.id === driver.id);
          if (migration && driver.driver_id !== migration.newDriverId) {
            console.log(`   ${driver.name}: Expected ${migration.newDriverId}, got ${driver.driver_id}`);
          }
        });
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed with error:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    await knex.destroy();
    console.log('\nDatabase connection closed.');
  }
}

// Run migration
if (require.main === module) {
  migrateDriverIds()
    .then(() => {
      console.log('\n✅ Migration script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { migrateDriverIds, convertTo7BFormat };

