#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const catalogPath = 'data/exercise-research-catalog.json';
const databasePath = 'exercise-analysis/exercise-database.json';
const libraryPath = 'docs/data/exercise-library.json';

const [catalog, database, library] = await Promise.all([
  readJson(catalogPath),
  readJson(databasePath),
  readJson(libraryPath),
]);

const researchBySource = new Map(
  catalog.entries
    .filter((entry) => entry.confidence === 'high' && entry.reviewStatus === 'usable')
    .map((entry) => [baseName(entry.sourceVideo), normalizeResearch(entry, catalog.references)]),
);

const analysisById = new Map(database.exercises.map((exercise) => [exercise.id, exercise]));
let enriched = 0;

for (const exercise of library.exercises) {
  const analysis = analysisById.get(exercise.id);
  const research = researchBySource.get(baseName(analysis?.sourceVideo));

  if (!research) continue;

  exercise.sourceVideo = analysis.sourceVideo;
  exercise.videoIndex = analysis.videoIndex;
  exercise.exerciseIndex = analysis.exerciseIndex;
  exercise.drillName = research.name;
  exercise.drillGoal_th = research.benefits[0];
  exercise.focus_th = research.focus;
  exercise.research = research;
  enriched += 1;
}

library.researchEnriched = enriched;
library.researchCatalogVersion = catalog.schemaVersion;
library.generatedAt = new Date().toISOString();

await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8');

console.log(`Enriched ${enriched} exercise clips with reviewed research data.`);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function baseName(value = '') {
  return value.replaceAll('\\', '/').split('/').pop();
}

function normalizeResearch(entry, references = {}) {
  const guidance = getResearchGuidance(entry.exerciseType);
  const benefits = guidance.benefits || entry.primaryBenefits || [];
  const cautions = guidance.cautions || entry.commonMistakes || [];
  const focus = guidance.focus || cautions.slice(0, 3);

  return {
    name: guidance.name || entry.thaiName,
    type: entry.exerciseType,
    confidence: entry.confidence,
    benefits,
    cautions,
    focus,
    sources: (entry.references || []).map((key) => references[key]).filter(Boolean),
  };
}

function getResearchGuidance(type) {
  const guidance = {
  deceleration: {
    name: 'ฝึกเบรกและลงเท้าเพื่อชะลอความเร็ว',
    benefits: [
      'ฝึกการเบรกและลดความเร็วให้มั่นคงก่อนเปลี่ยนทิศทาง',
      'เพิ่มการควบคุมแรงแบบ eccentric ที่สะโพก เข่า และข้อเท้า',
      'ช่วยให้การหยุดและ cut ในฟุตบอลปลอดภัยขึ้น',
    ],
    cautions: [
      'เข่าไม่ควรยุบเข้าด้านในตอนลงเท้า',
      'ลำตัวต้องไม่พุ่งหลุดจนหยุดไม่อยู่',
      'อย่าเร่งความเร็วถ้ายังหยุดนิ่งไม่ได้',
    ],
    focus: ['ลงเท้าแล้วหยุดได้มั่นคง', 'เข่าตรงกับปลายเท้า', 'คุมลำตัวก่อนเร่งต่อ'],
  },
  mobility_rehab: {
    name: 'ยืดฝ่าเท้าและน่องสำหรับรองช้ำ',
    benefits: [
      'ลดความตึงของฝ่าเท้าและน่อง',
      'ช่วยคืนช่วงการเคลื่อนไหวของข้อเท้าและนิ้วเท้า',
      'เหมาะเป็นส่วนหนึ่งของการกลับไปวิ่งแบบค่อยเป็นค่อยไป',
    ],
    cautions: [
      'อย่าฝืนยืดจนเจ็บแปลบ',
      'การยืดอย่างเดียวไม่พอถ้ายังรับ load ไม่ได้',
      'เพิ่มแรงและปริมาณฝึกทีละขั้น',
    ],
    focus: ['ยืดแบบไม่เจ็บ', 'คุมแรงกด', 'ตามด้วย strengthening ที่เหมาะสม'],
  },
  acl_return_to_play: {
    name: 'ACL return-to-play: คุม landing และเปลี่ยนทิศทาง',
    benefits: [
      'สร้างความมั่นใจในการลงเท้า เบรก และเปลี่ยนทิศทาง',
      'ฝึกการคุมเข่าและสะโพกในท่าที่ใกล้เคียงกีฬา',
      'เชื่อม rehab control ไปสู่ movement ในสนาม',
    ],
    cautions: [
      'อย่าเพิ่มความเร็วหรือความสูงถ้า landing ยังไม่นิ่ง',
      'ระวังเข่ายุบเข้าด้านในตอนลงหรือ plant',
      'ต้องไม่มีอาการเจ็บและควบคุมซ้ำได้ก่อนขยับระดับ',
    ],
    focus: ['landing เงียบและมั่นคง', 'เข่าคุมแนวได้', 'หยุดนิ่งได้ก่อนเปลี่ยนทิศ'],
  },
  coordination_footwork: {
    name: 'Agility ladder footwork',
    benefits: [
      'ฝึกจังหวะและตำแหน่งเท้า',
      'เพิ่ม coordination ด้วย load ต่ำ',
      'ใช้เป็น warm-up ก่อน drill เปลี่ยนทิศทางที่เร็วกว่า',
    ],
    cautions: [
      'ladder ไม่ใช่ agility เต็มรูปแบบถ้าไม่มีการตัดสินใจ',
      'อย่าเร่งจนตำแหน่งเท้าเสีย',
      'ควรต่อยอดไป field movement จริง',
    ],
    focus: ['จังหวะเท้าสม่ำเสมอ', 'เท้าวางตรงช่อง', 'เร็วแต่ยังคุม pattern ได้'],
  },
  plyometric_agility: {
    name: 'Plyometric agility contacts',
    benefits: [
      'ฝึกการแตะพื้นแบบ plyometric ระดับต่ำถึงกลาง',
      'เพิ่ม coordination สำหรับการเคลื่อนที่หลายทิศทาง',
      'เตรียมร่างกายก่อนเข้าสู่ cutting และ acceleration ที่เร็วขึ้น',
    ],
    cautions: [
      'ต้อง landing ได้คุมก่อนเพิ่ม speed',
      'หยุดเมื่อจังหวะเริ่มเสียจากความล้า',
      'อย่าใช้จำนวน contact มากเกินคุณภาพ',
    ],
    focus: ['แตะพื้นเร็วแต่เบา', 'จังหวะนิ่ง', 'หยุดก่อนฟอร์มเสีย'],
  },
  vbt_strength: {
    benefits: [
      'สร้าง strength พร้อมใช้ velocity ช่วยคุม intensity',
      'ติดตาม intent และ fatigue จากความเร็วของบาร์',
      'ช่วยต่อยอดไป power เมื่อ load และ velocity zone ถูกต้อง',
    ],
    cautions: [
      'อย่าไล่ load ถ้า velocity ตกชัดเจน',
      'ท่าและช่วงการเคลื่อนไหวต้องเหมือนกันทุก rep',
      'ตัวเลข velocity ต้องมาจาก setup ที่สม่ำเสมอ',
    ],
    focus: ['bar speed ยังดี', 'ฟอร์มคงที่', 'หยุด set เมื่อคุณภาพตก'],
  },
  sprint_acceleration: {
    name: 'ฝึกออกตัวและเร่งสปีดระยะสั้น',
    benefits: [
      'พัฒนา first step และ acceleration ระยะสั้น',
      'ฝึกการส่งแรงแนวนอน',
      'เชื่อมตรงกับจังหวะ sprint ในฟุตบอล',
    ],
    cautions: [
      'พักไม่พอจะกลายเป็น conditioning ไม่ใช่ speed',
      'อย่ายืนตัวตรงเร็วเกินไป',
      'คุณภาพ sprint สำคัญกว่าปริมาณ',
    ],
    focus: ['ออกตัวแรง', 'ลำตัวเอนไปข้างหน้า', 'พักให้พอก่อน rep ถัดไป'],
  },
  upper_body_pull_strength: {
    name: 'Inverted row ด้วย velocity',
    benefits: [
      'ฝึกแรงดึงแนวนอน',
      'พัฒนา upper-back และ trunk control',
      'ปรับระดับความยากได้ด้วยมุมลำตัว',
    ],
    cautions: [
      'สะโพกไม่ควรตก',
      'อย่ายักไหล่แทนการดึงหลัง',
      'รักษามุมลำตัวให้คงที่',
    ],
    focus: ['ลำตัวเป็นเส้นตรง', 'ดึงศอกไปหลัง', 'คุมจังหวะทั้งขึ้นและลง'],
  },
  hamstring_eccentric_strength: {
    name: 'Nordic curl',
    benefits: [
      'เพิ่ม eccentric hamstring strength',
      'ช่วยลดความเสี่ยง hamstring injury เมื่อจัดโปรแกรมแบบค่อยเป็นค่อยไป',
      'สนับสนุนความทนทานต่อ sprint',
    ],
    cautions: [
      'อย่าปล่อยตัวตกโดยไม่คุมช่วงลง',
      'สะโพกไม่ควรพับมากเกินไป',
      'เริ่ม volume ต่ำก่อน',
    ],
    focus: ['คุม lowering', 'สะโพกเหยียด', 'ช่วยดันกลับขึ้นเมื่อจำเป็น'],
  },
  loaded_jump_power: {
    name: 'Trap-bar jump',
    benefits: [
      'ฝึก explosive lower-body power',
      'ใช้น้ำหนักแบบถือกลางตัวเพื่อกระโดดได้เป็นธรรมชาติ',
      'เหมาะกับงาน power เมื่อ volume ต่ำและ intent สูง',
    ],
    cautions: [
      'อย่าใส่น้ำหนักหนักจนกระโดดช้า',
      'ต้องลงพื้นได้คุม',
      'ไม่ควรทำเป็น set ยาวจนล้า',
    ],
    focus: ['กระโดดเร็ว', 'ลงนิ่ง', 'พักพอให้ rep ต่อไปยังแรง'],
  },
  vbt_loaded_jump_power: {
    name: 'Trap-bar jump ด้วย velocity',
    benefits: [
      'ฝึก lower-body power พร้อมวัดความเร็วของ rep',
      'ใช้ velocity เพื่อคุมคุณภาพและหยุดเมื่อ speed drop',
      'ช่วยให้ power work ไม่กลายเป็นงานล้า',
    ],
    cautions: [
      'น้ำหนักต้องไม่หนักจน velocity ต่ำ',
      'หยุดเมื่อความเร็วตกชัดเจน',
      'landing ต้องมั่นคงทุก rep',
    ],
    focus: ['เร็วทุก rep', 'ดู speed drop', 'ลงพื้นมั่นคง'],
  },
  };

  return guidance[type] || {};
}
