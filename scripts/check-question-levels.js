const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAllQuestions() {
  const allQuestions = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('question_bank')
      .select('id, certification_level, tags, question_text')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allQuestions.push(...data);
    console.log(`Fetched ${allQuestions.length} questions...`);

    if (data.length < batchSize) break;
    offset += batchSize;
  }

  return allQuestions;
}

async function checkAndFixLevels() {
  console.log('Fetching all questions...');

  const data = await fetchAllQuestions();
  console.log('Total questions:', data.length);

  const fixes = [];

  data.forEach(q => {
    const tags = q.tags || [];

    // Check if tags suggest AEMT but current level is not AEMT
    if (q.certification_level !== 'AEMT') {
      const hasAEMT = tags.some(t => {
        const upper = (t || '').toUpperCase();
        return upper.includes('AEMT') ||
               upper === 'ADVANCED EMT' ||
               upper.startsWith('AEMT_') ||
               upper.startsWith('AEMT ');
      });

      if (hasAEMT) {
        fixes.push({ id: q.id, current: q.certification_level, should_be: 'AEMT', tags });
      }
    }

    // Check if tags suggest Paramedic but current level is not Paramedic
    if (q.certification_level !== 'Paramedic') {
      const hasParamedic = tags.some(t => {
        const upper = (t || '').toUpperCase();
        return upper.includes('PARAMEDIC') || upper === 'MEDIC';
      });

      if (hasParamedic) {
        fixes.push({ id: q.id, current: q.certification_level, should_be: 'Paramedic', tags });
      }
    }

    // Check if tags suggest EMR but current level is not EMR
    if (q.certification_level !== 'EMR') {
      const hasEMR = tags.some(t => {
        const upper = (t || '').toUpperCase();
        return upper === 'EMR' || upper.startsWith('EMR_') || upper.includes('EMR-') || upper.startsWith('EMR ');
      });

      if (hasEMR) {
        fixes.push({ id: q.id, current: q.certification_level, should_be: 'EMR', tags });
      }
    }
  });

  // Group by current -> should_be
  const summary = {};
  fixes.forEach(f => {
    const key = `${f.current} -> ${f.should_be}`;
    if (!summary[key]) summary[key] = [];
    summary[key].push(f);
  });

  console.log('\n=== Mismatched Questions ===');
  if (Object.keys(summary).length === 0) {
    console.log('No mismatches found!');
  } else {
    Object.entries(summary).forEach(([key, items]) => {
      console.log(`\n${key}: ${items.length} questions`);
      // Show sample tags
      const sampleTags = items.slice(0, 3).map(i => i.tags.join(', '));
      sampleTags.forEach(t => console.log('  Tags:', t));
    });

    // Apply fixes
    console.log('\n=== Applying Fixes ===');

    for (const [_key, items] of Object.entries(summary)) {
      const targetLevel = items[0].should_be;
      const ids = items.map(i => i.id);

      console.log(`Updating ${ids.length} questions to ${targetLevel}...`);

      // Update in batches of 100
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error: updateError } = await supabase
          .from('question_bank')
          .update({ certification_level: targetLevel })
          .in('id', batch);

        if (updateError) {
          console.error('Error updating batch:', updateError);
        }
      }
      console.log(`  Updated ${ids.length} questions`);
    }
  }

  // Show final counts
  console.log('\n=== Final Question Counts ===');
  const levels = ['EMR', 'EMT', 'AEMT', 'Paramedic'];
  let total = 0;
  for (const level of levels) {
    const { count } = await supabase
      .from('question_bank')
      .select('*', { count: 'exact', head: true })
      .eq('certification_level', level);
    console.log(`${level}: ${count}`);
    total += count || 0;
  }
  console.log(`Total: ${total}`);
}

checkAndFixLevels().catch(console.error);
