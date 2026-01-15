require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndRemoveDuplicates() {
  console.log('Checking for duplicate questions...\n');

  // Get total count
  const { count: total } = await supabase
    .from('question_bank')
    .select('*', { count: 'exact', head: true });

  console.log('Total questions in database:', total);

  // Fetch all questions in batches
  let allQuestions = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('question_bank')
      .select('id, question_text, created_at')
      .order('created_at', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allQuestions = allQuestions.concat(data);
    offset += batchSize;

    if (data.length < batchSize) break;
  }

  console.log('Fetched', allQuestions.length, 'questions');

  // Find duplicates - keep the first (oldest) one
  const seen = new Map();
  const duplicateIds = [];

  for (const q of allQuestions) {
    if (seen.has(q.question_text)) {
      duplicateIds.push(q.id);
    } else {
      seen.set(q.question_text, q.id);
    }
  }

  console.log('Unique questions:', seen.size);
  console.log('Duplicate entries to remove:', duplicateIds.length);

  if (duplicateIds.length > 0) {
    console.log('\nRemoving duplicates...');

    // Delete in batches
    const deleteBatchSize = 100;
    let deleted = 0;

    for (let i = 0; i < duplicateIds.length; i += deleteBatchSize) {
      const batch = duplicateIds.slice(i, i + deleteBatchSize);
      const { error } = await supabase
        .from('question_bank')
        .delete()
        .in('id', batch);

      if (error) {
        console.error('Error deleting batch:', error);
      } else {
        deleted += batch.length;
        process.stdout.write(`\rDeleted ${deleted}/${duplicateIds.length}`);
      }
    }

    console.log('\n\nDone! Removed', deleted, 'duplicate questions.');

    // Get new count
    const { count: newTotal } = await supabase
      .from('question_bank')
      .select('*', { count: 'exact', head: true });

    console.log('New total:', newTotal, 'unique questions');
  }
}

checkAndRemoveDuplicates();
