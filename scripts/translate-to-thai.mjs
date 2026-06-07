#!/usr/bin/env node
import fs from 'fs';

// Thai translation dictionary for fitness terms
const thaiDictionary = {
  // Common actions
  'reduce': 'ลด',
  'recover': 'ฟื้นฟู',
  'recover after training': 'ฟื้นฟูหลังฝึก',
  'reduce tightness': 'ลดความตึง',
  'tightness': 'ความตึง',
  'increase': 'เพิ่ม',
  'improve': 'ปรับปรุง',
  'develop': 'พัฒนา',
  'strengthen': 'เสริมแรง',
  'build': 'สร้าง',
  
  // Body parts
  'core': 'แกนกลาง',
  'glutes': 'กล้ามเนื้อเร้า',
  'legs': 'ขา',
  'back': 'หลัง',
  'shoulder': 'ไหล่',
  'ankle': 'ข้อเท้า',
  'hip': 'สะโพก',
  'knee': 'เข่า',
  'foot': 'เท้า',
  'hamstring': 'น้อยหน้าขา',
  
  // Movement qualities
  'control': 'ควบคุม',
  'stability': 'ความมั่นคง',
  'balance': 'สมดุล',
  'flexibility': 'ความยืดหยุ่น',
  'mobility': 'ความคล่องตัว',
  'power': 'พลัง',
  'speed': 'ความเร็ว',
  'agility': 'ความคล่องแคล่ว',
  'endurance': 'ความทนทาน',
  'explosive': 'ระเบิด',
  
  // Focus areas
  'slow range': 'ยืดช้าๆ',
  'no pain': 'ไม่ให้เจ็บ',
  'finish relaxed': 'ปลายสุดต้องนุ่มสบาย',
  'controlled': 'ควบคุม',
  'pain free': 'ปราศจากความเจ็บ',
  'gradual load': 'เพิ่มน้ำหนักค่อยๆ',
  'form first': 'ท่าทำก่อน',
  'quality': 'คุณภาพ',
  'continuous': 'ต่อเนื่อง',
  'explosive power': 'พลังระเบิด',
  'dynamic': 'พลวัต',
};

// Manual translation for complex phrases
const manualTranslations = {
  // Rehab & Recovery
  'return to training with controlled progression': 'กลับมาฝึกแบบค่อยๆ ขึ้น',
  'reduce tightness and recover after training': 'ลดความตึงและฟื้นฟูหลังฝึก',
  'activate and prepare muscles': 'เตรียมกล้ามเนื้อให้พร้อม',
  'improve ankle mobility': 'เพิ่มความคล่องตัวข้อเท้า',
  'strengthen ankle stability': 'เสริมแรงความมั่นคงข้อเท้า',
  'improve foot flexibility': 'ปรับปรุงความยืดหยุ่นเท้า',
  'reduce plantar fasciitis': 'ลดอักเสบส้นเท้า',
  'relieve calf tightness': 'คลายความตึงน่องขา',
  
  // Core & Control
  'build core strength foundation': 'สร้างพื้นฐานแรงแกนกลาง',
  'improve body control': 'ปรับปรุงการควบคุมร่างกาย',
  'develop stability': 'พัฒนาความมั่นคง',
  'enhance balance': 'เพิ่มความสมดุล',
  
  // Power & Agility
  'develop explosive power': 'พัฒนาพลังระเบิด',
  'improve change of direction': 'ปรับปรุงการเปลี่ยนทิศทาง',
  'enhance agility': 'เพิ่มความคล่องแคล่ว',
  'improve deceleration': 'ปรับปรุงการหยุดเร็ว',
};

// Translate single phrase
function translatePhrase(phrase) {
  if (!phrase) return '';
  
  const lower = phrase.toLowerCase().trim();
  
  // Check manual translations first (longer phrases)
  for (const [en, th] of Object.entries(manualTranslations)) {
    if (lower.includes(en)) {
      return phrase.replace(new RegExp(en, 'gi'), th);
    }
  }
  
  // Then check dictionary
  let result = phrase;
  for (const [en, th] of Object.entries(thaiDictionary)) {
    result = result.replace(new RegExp(en, 'gi'), th);
  }
  
  return result;
}

// Main translation
const dataFile = 'docs/data/exercise-library.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

console.log('🇹🇭 แปลท่าฝึกเป็นภาษาไทย\n');

let translated = 0;
const failedTranslations = [];

data.exercises.forEach((exercise, idx) => {
  // Translate goal
  if (exercise.drillGoal) {
    exercise.drillGoal_th = translatePhrase(exercise.drillGoal);
  }
  
  // Translate focus areas
  if (exercise.focus && Array.isArray(exercise.focus)) {
    exercise.focus_th = exercise.focus.map(item => translatePhrase(item));
  }
  
  translated++;
  
  if ((idx + 1) % 50 === 0) {
    console.log(`   [${idx + 1}/${data.exercises.length}] ✅ แปลแล้ว`);
  }
});

// Save
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

console.log(`\n✅ เสร็จสิ้น!`);
console.log(`   รวม: ${translated} ท่า`);
console.log(`\n📝 ตัวอย่างการแปล:`);

const sample = data.exercises.slice(0, 3);
sample.forEach(ex => {
  console.log(`\n   [${ex.id}] ${ex.drillName}`);
  console.log(`   Goal: ${ex.drillGoal}`);
  console.log(`   Goal TH: ${ex.drillGoal_th}`);
  if (ex.focus && ex.focus[0]) {
    console.log(`   Focus: ${ex.focus[0]}`);
    console.log(`   Focus TH: ${ex.focus_th[0]}`);
  }
});
