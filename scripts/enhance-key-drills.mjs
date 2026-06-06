import { readFile, writeFile } from 'node:fs/promises';

const drillsFile = 'docs/data/training-drills.json';

// Detailed exercise data for key drills
const keyDrillEnhancements = {
  // Mobility
  'stretch|flexibility|mobility|ยืด': {
    focus: 'Flexibility, Tissue Mobility',
    difficulty: 1,
    duration_sec: '10-15s',
    technique_notes: 'Hold at mild tension without pain, control breathing, never bounce'
  },

  // Core
  'core|abs|abdominal|คอร์|ท้อง': {
    focus: 'Core Stability, Abdominal Strength',
    difficulty: 2,
    duration_sec: '20-30s',
    technique_notes: 'Maintain neutral spine, brace core, control movement through entire range'
  },

  // Balance & Proprioception
  'balance|single-leg|single leg|เดิน|ยืนเดียว|สมดุล': {
    focus: 'Balance, Proprioception, Single-Leg Stability',
    difficulty: 2,
    duration_sec: '15-20s',
    technique_notes: 'Single-leg work, minimize ankle wobble, maintain upright posture'
  },

  // Deceleration (ACL critical)
  'deceleration|brake|slow down|หยุด|เบรก': {
    focus: 'Deceleration, Eccentric Strength, ACL Safety',
    difficulty: 3,
    duration_sec: '20-30s',
    technique_notes: 'Control descent, knee tracking over toe, eccentric focus, prevent knee valgus'
  },

  // Single-Leg Strength (ACL critical)
  'single|squat|lunge|hop|single-leg|ขา|เล่น': {
    focus: 'Single-Leg Strength, Power, ACL Resilience',
    difficulty: 3,
    duration_sec: '15-25s',
    technique_notes: 'Support leg load, neutral knee tracking, control hip, prevent compensations'
  },

  // Agility & Change of Direction
  'agility|cut|change|direction|รวบ|เปลี่ยน': {
    focus: 'Agility, Change of Direction, Reactive Strength',
    difficulty: 3,
    duration_sec: '25-40s',
    technique_notes: 'Quick feet, maintain low center of gravity, sharp deceleration before direction change'
  },

  // Plyometric (Power)
  'jump|hop|power|plyometric|explosive|กระโดด': {
    focus: 'Power, Explosive Strength, Lower Body Reactivity',
    difficulty: 4,
    duration_sec: '20-30s',
    technique_notes: 'Land softly with knees bent, control descent, explosive rebound, minimize ground contact time'
  },

  // Football Specific
  'football|soccer|kick|shoot|ฟุตบอล': {
    focus: 'Sport-Specific Power, Shooting Accuracy, Game Movement',
    difficulty: 3,
    duration_sec: '20-30s',
    technique_notes: 'Soccer-specific movement pattern, functional strength emphasis, sport context'
  },

  // Rehab/Control (ACL recovery)
  'rehab|recovery|control|return|ฟื้น': {
    focus: 'Rehabilitation, Movement Control, Gradual Loading',
    difficulty: 1,
    duration_sec: '15-20s',
    technique_notes: 'Pain-free range only, controlled tempo, focus on movement quality over intensity'
  }
};

console.log('🎯 Enhancing key drills with detailed metadata...\n');

const drillsData = JSON.parse(await readFile(drillsFile, 'utf8'));
let enhanced = 0;

drillsData.drills.forEach((drill, index) => {
  // Skip if already has technique notes
  if (drill.cues && drill.cues.length > 20) return;

  const drillNameLower = drill.name.toLowerCase();
  const categoryLower = drill.category?.toLowerCase() || '';

  // Find matching enhancement
  for (const [pattern, enhancement] of Object.entries(keyDrillEnhancements)) {
    const keywords = pattern.split('|');
    const matches = keywords.some(kw =>
      drillNameLower.includes(kw) || categoryLower.includes(kw)
    );

    if (matches) {
      drill.focus = enhancement.focus;
      drill.level = Math.max(drill.level || 1, enhancement.difficulty);
      drill.cues = enhancement.technique_notes;
      drill.minutes = parseInt(enhancement.duration_sec) || drill.minutes;
      enhanced++;
      break;
    }
  }
});

await writeFile(drillsFile, JSON.stringify(drillsData, null, 2), 'utf8');

console.log(`✅ Enhancement complete!`);
console.log(`   📝 Enhanced: ${enhanced} drills`);
console.log(`   📊 Total drills: ${drillsData.drills.length}`);
console.log(`\n🎯 Key drills now have detailed metadata ready for app!`);
