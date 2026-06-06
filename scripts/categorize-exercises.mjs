#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const dbFile = 'exercise-analysis/exercise-database.json';
const db = JSON.parse(readFileSync(dbFile, 'utf8'));

// Read training drills for context
const trainingFile = 'docs/data/training-drills.json';
const training = JSON.parse(readFileSync(trainingFile, 'utf8'));

// Build lookup: video filename -> drill info
const drillLookup = {};
training.drills.forEach(drill => {
  if (drill.tiktokUrl) {
    const videoId = drill.tiktokUrl.split('/').pop();
    drillLookup[videoId] = drill;
  }
});

console.log('🏷️ Categorizing exercises...\n');

// Category detection rules
const categoryRules = {
  'Mobility': ['stretch', 'ยืด', 'mobility', 'ตึง', 'passive', 'ผ่อนคลาย'],
  'Power': ['power', 'jump', 'plyometric', 'plyo', 'explosive', 'พลัง', 'ระเบิด', 'กระโดด'],
  'Strength': ['strength', 'squat', 'lunge', 'push', 'pull', 'แรง', 'กล้ามเนื้อ', 'ยกน้ำหนัก'],
  'Balance': ['balance', 'stability', 'single leg', 'proprioception', 'สมดุล', 'มั่นคง'],
  'Agility': ['agility', 'lateral', 'direction change', 'footwork', 'ว่องไว', 'เปลี่ยนทิศ'],
  'Flexibility': ['flexibility', 'range', 'passive', 'stretch', 'ยืดเส้น'],
  'Rehab': ['rehab', 'recovery', 'acl', 'injury', 'ฟื้นฟู', 'เจ็บ', 'ฟื้นหาย'],
  'Deceleration': ['deceleration', 'brake', 'eccentric', 'ชะลอ', 'หยุด', 'เบรก'],
  'Coordination': ['coordination', 'complex', 'multi-plane', 'neural', 'สัมพัติ']
};

function detectCategory(exerciseId, sourceVideo) {
  // Try to find drill info from source video
  const videoId = sourceVideo.replace('.mp4', '').match(/\d+/)?.[0] || '';
  const drill = drillLookup[videoId];

  if (drill) {
    const category = drill.category || 'General';
    return category;
  }

  // Fallback: analyze filename
  const lowerName = (sourceVideo + ' ' + exerciseId).toLowerCase();

  for (const [category, keywords] of Object.entries(categoryRules)) {
    if (keywords.some(kw => lowerName.includes(kw))) {
      return category;
    }
  }

  return 'Uncategorized';
}

// Categorize all exercises
db.exercises.forEach(exercise => {
  exercise.category = detectCategory(exercise.id, exercise.sourceVideo);
  exercise.status = 'categorized';
});

// Rebuild category stats
db.categories = {};
db.exercises.forEach(ex => {
  if (!db.categories[ex.category]) {
    db.categories[ex.category] = 0;
  }
  db.categories[ex.category]++;
});

// Save updated database
writeFileSync(dbFile, JSON.stringify(db, null, 2));

console.log('✅ Categorization complete!\n');
console.log('📊 Exercise breakdown by category:');
Object.entries(db.categories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`   ${cat.padEnd(20)}: ${count}`);
  });

console.log(`\n📈 Total exercises extracted: ${db.totalClipsExtracted}`);
console.log(`📄 Database updated: ${dbFile}`);

// Generate summary by drill
console.log('\n📋 Exercises per original video:');
const videoCounts = {};
db.exercises.forEach(ex => {
  if (!videoCounts[ex.sourceVideo]) {
    videoCounts[ex.sourceVideo] = 0;
  }
  videoCounts[ex.sourceVideo]++;
});

Object.entries(videoCounts)
  .slice(0, 5)
  .forEach(([video, count]) => {
    console.log(`   ${video}: ${count} exercises`);
  });

console.log(`   ... and ${Object.keys(videoCounts).length - 5} more videos`);
