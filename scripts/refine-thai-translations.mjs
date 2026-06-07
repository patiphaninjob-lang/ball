#!/usr/bin/env node
import fs from 'fs';

// More comprehensive Thai translation dictionary
const thaiDictionary = {
  // Common phrases
  'pain free': 'ปราศจากความเจ็บ',
  'pain-free': 'ปราศจากความเจ็บ',
  'pain': 'เจ็บ',
  'range': 'ระดับ',
  'clean': 'สะอาด',
  'sharp': 'ชาญฉลาด',
  'crisp': 'แหลม',
  'work': 'ทำงาน',
  'feet': 'เท้า',
  'foot': 'เท้า',
  'landing': 'เก็บ',
  'takeoff': 'ยิง',
  'faster': 'เร็วขึ้น',
  'slower': 'ช้าลง',
  'higher': 'สูงขึ้น',
  'lower': 'ต่ำลง',
  'forward': 'ไปข้างหน้า',
  'backward': 'ถอยหลัง',
  'lateral': 'ข้าง',
  'rotation': 'หมุน',
  'twist': 'บิด',
};

function refineTranslations(text) {
  if (!text) return text;
  
  let result = text;
  
  // Fix common issues
  for (const [en, th] of Object.entries(thaiDictionary)) {
    result = result.replace(new RegExp(en, 'gi'), th);
  }
  
  // Clean up multiple Thai words in a row (likely duplicates)
  // Thai script detection - if we see Thai characters mixed with English oddly, note it
  
  return result;
}

const dataFile = 'docs/data/exercise-library.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log('🔧 ปรับปรุงคำแปลเป็นไทย\n');

let improved = 0;

data.exercises.forEach(exercise => {
  // Refine goal
  if (exercise.drillGoal_th) {
    const improved_goal = refineTranslations(exercise.drillGoal_th);
    if (improved_goal !== exercise.drillGoal_th) {
      exercise.drillGoal_th = improved_goal;
      improved++;
    }
  }
  
  // Refine focus items
  if (exercise.focus_th && Array.isArray(exercise.focus_th)) {
    exercise.focus_th = exercise.focus_th.map(item => refineTranslations(item));
  }
});

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

console.log(`✅ ปรับปรุงแล้ว ${improved} ข้อความ\n`);
console.log('📝 ตัวอย่างที่ปรับปรุง:');

// Show some refined examples
const samples = data.exercises.slice(0, 3);
samples.forEach(ex => {
  if (ex.drillGoal_th) {
    console.log(`   ${ex.id}: ${ex.drillGoal_th}`);
  }
});
