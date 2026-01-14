/**
 * Script to create a new admin user
 * 
 * Usage: node scripts/create-admin.js
 */

const bcrypt = require('bcryptjs');
const knex = require('../src/utils/knex');

// Admin details
const newAdmin = {
    name: 'Admin User',  // You can change this
    phone: '0987654321',
    password: 'admin123',
    role: 'admin',  // 'admin' or 'super_admin'
    disabled: false
};

async function createAdmin() {
    try {
        console.log('🔍 Checking database connection...');
        
        // Test database connection
        await knex.raw('SELECT 1');
        console.log('✅ Database connected successfully\n');

        // Check if admin already exists
        console.log(`🔍 Checking if admin with phone ${newAdmin.phone} already exists...`);
        const existingAdmin = await knex('admins')
            .where('phone', newAdmin.phone)
            .first();

        if (existingAdmin) {
            console.log(`❌ Admin with phone ${newAdmin.phone} already exists!`);
            console.log(`   Name: ${existingAdmin.name}`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log(`   Disabled: ${existingAdmin.disabled}`);
            console.log('\n💡 If you want to update this admin, use UPDATE query instead.');
            process.exit(1);
        }

        console.log('✅ Phone number is available\n');

        // Hash the password
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(newAdmin.password, 10);
        console.log('✅ Password hashed successfully\n');

        // Insert new admin
        console.log('📝 Creating new admin...');
        const [createdAdmin] = await knex('admins')
            .insert({
                name: newAdmin.name,
                phone: newAdmin.phone,
                password: hashedPassword,
                role: newAdmin.role,
                disabled: newAdmin.disabled,
                created_at: new Date(),
            })
            .returning(['id', 'name', 'phone', 'role', 'disabled', 'created_at']);

        console.log('✅ Admin created successfully!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📋 Admin Details:');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`   ID:       ${createdAdmin.id}`);
        console.log(`   Name:     ${createdAdmin.name}`);
        console.log(`   Phone:    ${createdAdmin.phone}`);
        console.log(`   Password: ${newAdmin.password} (plain text - for your reference)`);
        console.log(`   Role:     ${createdAdmin.role}`);
        console.log(`   Disabled: ${createdAdmin.disabled}`);
        console.log(`   Created:  ${createdAdmin.created_at}`);
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('🎉 Admin account is ready to use!');
        console.log(`   Login with: ${createdAdmin.phone} / ${newAdmin.password}\n`);

        if (createdAdmin.role === 'admin') {
            console.log('ℹ️  This is a regular admin with limited access.');
            console.log('   Can access: Create Account, Trip History, Top-up');
            console.log('   Cannot access: Dashboard, Customers, Delete Drivers, etc.\n');
        } else {
            console.log('ℹ️  This is a SUPER ADMIN with full access to everything.\n');
        }

        console.log('📝 Next steps:');
        console.log('   1. ✅ Admin created in database');
        console.log('   2. Test login from admin dashboard');
        console.log('   3. Verify role-based permissions work correctly\n');

    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        console.error('\n🔍 Error details:', error);
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.error('\n💡 Database connection failed. Please check:');
            console.error('   - DATABASE_URL in .env file');
            console.error('   - Database server is running');
            console.error('   - Network connectivity');
        } else if (error.code === '23505') {
            console.error('\n💡 Duplicate entry. Admin with this phone already exists.');
        } else if (error.code === '23502') {
            console.error('\n💡 Missing required field in admins table.');
        }
        
        process.exit(1);
    } finally {
        // Close database connection
        await knex.destroy();
        console.log('👋 Database connection closed.');
    }
}

// Run the script
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║           Create New Admin User Script                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

createAdmin();

