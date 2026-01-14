# Driver ID Migration Script

## Overview

This script migrates all existing driver IDs from numeric format (e.g., "0001", "0002") to 7 Brothers format (e.g., "7B001", "7B002").

## Prerequisites

1. Database connection configured in `.env` file with `DATABASE_URL`
2. Node.js and npm installed
3. All dependencies installed (`npm install`)
4. Network access to your database server
5. Correct database credentials

## Usage

### 1. Dry Run (Preview Changes)

First, always run a dry run to preview what will be changed:

```bash
node scripts/migrate-driver-ids-to-7b.js --dry-run
```

This will:
- Show all drivers that will be migrated
- Display old and new driver IDs
- Check for conflicts
- **NOT make any database changes**

### 2. Execute Migration

Once you've reviewed the dry run output, execute the migration:

```bash
node scripts/migrate-driver-ids-to-7b.js
```

### 3. Resume from Specific Number

If migration is interrupted, you can resume from a specific driver ID number:

```bash
node scripts/migrate-driver-ids-to-7b.js --start-from=50
```

This will only migrate drivers with numeric driver_id >= 50.

## Migration Logic

### Conversion Rules

- `"0001"` → `"7B001"`
- `"0002"` → `"7B002"`
- `"0010"` → `"7B010"`
- `"0123"` → `"7B123"`
- `"9999"` → `"7B999"`

### Safety Checks

1. **Skips 7B format**: Drivers already in 7B format are skipped
2. **Validates numeric**: Only numeric driver_ids are converted
3. **Checks conflicts**: Verifies target driver_id doesn't already exist
4. **Transaction safety**: Uses database transaction for atomicity
5. **Verification**: After migration, verifies all changes were applied correctly

## Example Output

```
============================================================
Driver ID Migration Script - Convert to 7B Format
============================================================
Mode: DRY RUN (no changes will be made)

Step 1: Fetching drivers with numeric driver_id...
Found 8 driver(s) to migrate.

Step 2: Preparing migration data...

Step 3: Migration Preview

Drivers to be migrated:
------------------------------------------------------------
ID                                    Name                 Old ID     New ID
------------------------------------------------------------
abc-123-uuid-...                     Test Driver          0001       7B001
def-456-uuid-...                     Sbsb                 0002       7B002
ghi-789-uuid-...                     Ko Wai Phyo          0003       7B003
...

Total: 8 driver(s) will be migrated

✅ DRY RUN complete. No changes were made.
   Run without --dry-run to apply changes.
```

## Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **Test Environment**: Test the script in a development/staging environment first
3. **Dry Run First**: Always run with `--dry-run` first to preview changes
4. **No Rollback**: This script doesn't include rollback functionality - ensure you have backups
5. **Foreign Keys**: This migration is safe - foreign keys use UUID `id`, not text `driver_id`

## Troubleshooting

### Error: "DATABASE_URL not found"

Make sure your `.env` file exists and contains the `DATABASE_URL` variable:
```
DATABASE_URL=postgres://username:password@host:5432/database
```

### Error: "Database connection failed" or "ENOTFOUND"

Check:
1. Your `DATABASE_URL` is correct in `.env` file
2. Database server is accessible from your network
3. Database credentials (username/password) are correct
4. Firewall or security groups allow your IP address
5. If using AWS RDS, check security group inbound rules

### Error: "Target driver_id already exists"

This means the target 7B format ID is already in use. The script will skip this driver and continue with others. You may need to manually resolve conflicts.

### Error: "Driver ID is not numeric"

Some drivers may have non-numeric driver_ids. These will be skipped. Review the error list to see which drivers were skipped.

### Migration Interrupted

If migration is interrupted, you can resume using `--start-from=N` where N is the numeric value of the last successfully migrated driver_id.

## Post-Migration

After migration:

1. Verify all drivers appear correctly in the Drivers page
2. Check that existing functionality still works
3. Test driver sign-in with new driver_id format
4. Verify no foreign key relationships are broken (they shouldn't be, as they use UUID)

## Rollback (Manual)

If you need to rollback, you would need to manually update driver_ids back to numeric format. The script doesn't provide automatic rollback, so ensure you have database backups.

