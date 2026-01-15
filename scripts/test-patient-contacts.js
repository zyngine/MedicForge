const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery() {
  const { data, error } = await supabase
    .from('clinical_patient_contacts')
    .select(`
      *,
      student:users!clinical_patient_contacts_student_id_fkey(id, full_name, email),
      booking:clinical_shift_bookings(
        *,
        shift:clinical_shifts(
          *,
          site:clinical_sites(*)
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('Error:', error.message);
    console.log('Code:', error.code);
  } else {
    console.log('Success! Records:', data?.length || 0);
  }
}

testQuery();
