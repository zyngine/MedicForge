const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env file manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Platform Admin credentials
const ADMIN = {
  email: 'admin@medicforge.net',
  password: 'MedicForge2024!Admin',
  name: 'Platform Administrator',
};

async function createPlatformAdmin() {
  console.log('Creating Platform Admin account...\n');

  try {
    // Check if this admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === ADMIN.email);

    if (existingAdmin) {
      console.log('User with this email already exists, checking platform_admins...');

      // Check if they're already a platform admin
      const { data: adminRecord } = await supabase
        .from('platform_admins')
        .select('id')
        .eq('user_id', existingAdmin.id)
        .single();

      if (adminRecord) {
        console.log('Platform admin already exists!');
        console.log(`Email: ${ADMIN.email}`);
        return;
      }

      // Add to platform_admins table
      const { error: insertError } = await supabase
        .from('platform_admins')
        .insert({
          user_id: existingAdmin.id,
          role: 'super_admin',
        });

      if (insertError) throw insertError;
      console.log('Added existing user to platform_admins table');
    } else {
      // Create new auth user
      console.log('Creating auth user...');
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN.email,
        password: ADMIN.password,
        email_confirm: true,
        user_metadata: {
          full_name: ADMIN.name,
          is_platform_admin: true,
        },
      });

      if (authError) throw authError;
      console.log(`Auth user created: ${authUser.user.id}`);

      // Add to platform_admins table
      console.log('Adding to platform_admins table...');
      const { error: adminError } = await supabase
        .from('platform_admins')
        .insert({
          user_id: authUser.user.id,
          role: 'super_admin',
        });

      if (adminError) throw adminError;
      console.log('Added to platform_admins table');
    }

    console.log('\n' + '='.repeat(60));
    console.log('Platform Admin created successfully!');
    console.log('='.repeat(60));
    console.log('\nPlatform Admin Credentials:');
    console.log(`   Email: ${ADMIN.email}`);
    console.log(`   Password: ${ADMIN.password}`);
    console.log('\nLogin at: /platform-admin');
    console.log('\n');

  } catch (error) {
    console.error('Error creating platform admin:', error);
    process.exit(1);
  }
}

createPlatformAdmin();
