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

// Detect certification level from filename
function getCertificationFromFilename(filename) {
  const upper = filename.toUpperCase();
  if (upper.includes('_EMR_') || upper.startsWith('EMR_')) return 'EMR';
  if (upper.includes('_AEMT_') || upper.startsWith('AEMT_')) return 'AEMT';
  if (upper.includes('_PARAMEDIC_') || upper.startsWith('PARAMEDIC_')) return 'Paramedic';
  if (upper.includes('_EMT_') || upper.startsWith('EMT_')) return 'EMT';
  return 'EMT'; // default
}

function parseCSV(content, certificationLevel = 'EMT') {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const questions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.replace(/^"|"$/g, '') || '';
    });

    // Handle vocabulary format: term + definition becomes the question
    let questionText = row.question || row.question_text || row.text || row.statement;

    // For vocab files, create question from term and definition
    if (!questionText && row.term) {
      if (row.definition) {
        questionText = `Which of the following best describes "${row.term}"? (${row.definition})`;
      } else {
        questionText = `What is the definition of "${row.term}"?`;
      }
    }

    if (!questionText) continue;

    const options = [];
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach(letter => {
      const optionText = row['option_' + letter] || row['option' + letter] || row[letter];
      if (optionText) {
        const correctAnswer = (row.correct_answer || row.correct || row.answer || '').toUpperCase();
        options.push({
          id: letter,
          text: optionText,
          isCorrect: correctAnswer === letter.toUpperCase()
        });
      }
    });

    questions.push({
      question_text: questionText,
      question_type: options.length > 0 ? 'multiple_choice' : 'short_answer',
      options: options.length > 0 ? options : null,
      correct_answer: options.length > 0
        ? { answerId: (row.correct_answer || row.correct || row.answer || 'a').toLowerCase() }
        : { text: row.correct_answer || row.correct || row.answer || '' },
      explanation: row.rationale || row.explanation || null,
      certification_level: row.certification || row.certification_level || certificationLevel,
      difficulty: row.difficulty || 'medium',
      tags: row.category ? [row.category, row.subcategory].filter(Boolean) : null,
    });
  }
  return questions;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function fetchExistingQuestions() {
  console.log('Fetching existing questions to check for duplicates...');
  const existingTexts = new Set();
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('question_bank')
      .select('question_text')
      .range(offset, offset + batchSize - 1);

    if (error || !data || data.length === 0) break;
    data.forEach(q => existingTexts.add(q.question_text));
    offset += batchSize;
    if (data.length < batchSize) break;
  }

  console.log('Found ' + existingTexts.size + ' existing questions');
  return existingTexts;
}

async function main() {
  console.log('Starting batch import...');
  const existingTexts = await fetchExistingQuestions();

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('role', 'instructor')
    .limit(1)
    .single();

  if (userError || !user) {
    console.error('Could not find instructor user:', userError);
    process.exit(1);
  }

  console.log('Using tenant_id: ' + user.tenant_id + ', created_by: ' + user.id);

  const importDir = path.join(__dirname, '..', 'question-imports');
  const files = fs.readdirSync(importDir).filter(f => f.endsWith('.csv'));
  console.log('Found ' + files.length + ' CSV files to import');

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const file of files) {
    const filePath = path.join(importDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const certLevel = getCertificationFromFilename(file);
    const questions = parseCSV(content, certLevel);

    if (questions.length === 0) {
      console.log('  Skipping ' + file + ' - no valid questions');
      continue;
    }

    const newQuestions = questions.filter(q => !existingTexts.has(q.question_text));
    const skipped = questions.length - newQuestions.length;
    totalSkipped += skipped;

    if (newQuestions.length === 0) {
      console.log('  Skipping ' + file + ' - all ' + questions.length + ' questions already exist');
      continue;
    }

    const questionsWithMeta = newQuestions.map(q => ({
      ...q,
      tenant_id: user.tenant_id,
      created_by: user.id,
    }));

    const batchSize = 100;
    let fileImported = 0;
    for (let i = 0; i < questionsWithMeta.length; i += batchSize) {
      const batch = questionsWithMeta.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('question_bank')
        .insert(batch)
        .select('id');

      if (error) {
        console.error('  Error importing batch from ' + file + ':', error.message);
        totalErrors += batch.length;
      } else {
        totalImported += data.length;
        fileImported += data.length;
        batch.forEach(q => existingTexts.add(q.question_text));
      }
    }

    const skipMsg = skipped > 0 ? ' (' + skipped + ' duplicates skipped)' : '';
    console.log('  Imported ' + fileImported + ' new questions from ' + file + skipMsg);
  }

  console.log('\n=== Import Complete ===');
  console.log('Total imported: ' + totalImported);
  console.log('Total skipped (duplicates): ' + totalSkipped);
  console.log('Total errors: ' + totalErrors);
}

main().catch(console.error);
