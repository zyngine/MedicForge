/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n').forEach(line => {
  const [key, ...v] = line.split('=');
  if (key && v.length) process.env[key.trim()] = v.join('=').trim();
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixQuestions() {
  const { data: cats } = await supabase.from('question_bank_categories').select('*');
  console.log('Found', cats.length, 'categories');
  
  const catMap = {};
  cats.forEach(c => {
    const name = c.name.toLowerCase();
    if (name.includes('airway') || name.includes('respiration') || name.includes('ventilation')) catMap['airway'] = c.id;
    if (name.includes('cardio') || name.includes('resuscitation')) catMap['cardio'] = c.id;
    if (name.includes('trauma')) catMap['trauma'] = c.id;
    if (name.includes('medical') || name.includes('obstetric')) catMap['medical'] = c.id;
    if (name.includes('operation')) catMap['operations'] = c.id;
    if (name.includes('pharmacology')) catMap['pharmacology'] = c.id;
    if (name.includes('pediatric')) catMap['pediatric'] = c.id;
    if (name.includes('12-lead') || name.includes('ecg')) catMap['ecg'] = c.id;
  });
  
  // Get total count
  const { count } = await supabase.from('question_bank').select('*', { count: 'exact', head: true });
  console.log('Total questions:', count);
  
  let updated = 0;
  const pageSize = 1000;
  
  for (let offset = 0; offset < count; offset += pageSize) {
    const { data: questions } = await supabase
      .from('question_bank')
      .select('id, question_text, certification_level')
      .range(offset, offset + pageSize - 1);
    
    console.log('Processing batch at offset', offset, '- got', questions.length, 'questions');
    
    for (const q of questions) {
      const text = q.question_text.toLowerCase();
      let categoryId = null;
      let tags = [];
      
      if (text.includes('intubat') || text.includes('airway') || text.includes('ventilat') || text.includes('oxygen') || text.includes('bvm') || text.includes('etco2') || text.includes('capno') || text.includes('cricothyro') || text.includes('laryngo') || text.includes('trache')) {
        categoryId = catMap['airway'];
        tags.push('Airway');
      } else if (text.includes('cardiac') || text.includes('heart') || text.includes('rhythm') || text.includes('ecg') || text.includes('stemi') || text.includes('cpr') || text.includes('aed') || text.includes('pacemaker') || text.includes('cardioversion') || text.includes('tachycardia') || text.includes('bradycardia') || text.includes('fibrillation') || text.includes('chest pain') || text.includes('12-lead') || text.includes('infarct')) {
        categoryId = catMap['cardio'];
        tags.push('Cardiology');
      } else if (text.includes('trauma') || text.includes('fracture') || text.includes('bleed') || text.includes('hemorrhage') || text.includes('wound') || text.includes('injury') || text.includes('burn') || text.includes('splint') || text.includes('tourniquet') || text.includes('mva') || text.includes('collision') || text.includes('fall')) {
        categoryId = catMap['trauma'];
        tags.push('Trauma');
      } else if (text.includes('medication') || text.includes('drug') || text.includes('dose') || text.includes('epinephrine') || text.includes('adenosine') || text.includes('amiodarone') || text.includes('mg/kg') || text.includes('pharmacol') || text.includes('lidocaine') || text.includes('atropine') || text.includes('dopamine') || text.includes('fentanyl')) {
        categoryId = catMap['pharmacology'];
        tags.push('Pharmacology');
      } else if (text.includes('pediatric') || text.includes('child') || text.includes('infant') || text.includes('neonate') || text.includes('obstetric') || text.includes('pregnan') || text.includes('delivery') || text.includes('newborn') || text.includes('labor') || text.includes('apgar')) {
        categoryId = catMap['pediatric'] || catMap['medical'];
        tags.push('Pediatrics/OB');
      } else {
        categoryId = catMap['medical'];
        tags.push('Medical');
      }
      
      tags.push(q.certification_level);
      
      await supabase
        .from('question_bank')
        .update({ category_id: categoryId, tags: tags })
        .eq('id', q.id);
      
      updated++;
    }
    console.log('  Total updated so far:', updated);
  }
  
  console.log('\nDone! Updated', updated, 'questions');
}

fixQuestions().catch(console.error);
