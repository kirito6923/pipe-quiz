// GitHub Actions 每日任务：从题库池轮换出当天 15 题，维护最近 7 天去重历史
// 用法：node _gen/build-daily.mjs [仓库根目录]
import fs from 'node:fs';
import path from 'node:path';
import { pickDaily } from './daily.mjs';

const ROOT = process.argv[2] || process.cwd();
const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
const updated = new Date().toISOString();

const poolFile = path.join(ROOT, 'pool.json');
const histFile = path.join(ROOT, 'history.json');
const dailyFile = path.join(ROOT, 'daily.json');
const bankFile = path.join(ROOT, 'bank.json');

let pool = [];
try {
  pool = JSON.parse(fs.readFileSync(poolFile, 'utf8')).items || [];
} catch (e) {
  console.error('缺少 pool.json，先运行 build.mjs');
  process.exit(1);
}
if (!pool.length) {
  console.error('pool.json 为空');
  process.exit(1);
}

// 幂等：同一天已经生成过就不改，避免一天内多次运行换题
try {
  const old = JSON.parse(fs.readFileSync(dailyFile, 'utf8'));
  if (old.date === date) {
    console.log(`${date} 已生成过，跳过`);
    process.exit(0);
  }
} catch (e) { /* 首次 */ }

let hist = { byDate: {} };
try {
  hist = JSON.parse(fs.readFileSync(histFile, 'utf8'));
} catch (e) { /* 首次运行 */ }
hist.byDate = hist.byDate || {};

const dayStr = (ms) => new Date(ms).toISOString().slice(0, 10);
const cutoff = dayStr(Date.now() - 4 * 86400000);
const recent = Object.entries(hist.byDate)
  .filter(([d]) => d >= cutoff)
  .flatMap(([, ids]) => ids || []);

const questions = pickDaily(pool, date, recent).map((q) => ({ ...q, key: `${date}-${q.id}` }));

hist.byDate[date] = questions.map((q) => q.id);
for (const d of Object.keys(hist.byDate)) {
  if (d < dayStr(Date.now() - 30 * 86400000)) delete hist.byDate[d];
}

fs.writeFileSync(dailyFile, JSON.stringify({ date, updated, count: questions.length, questions }, null, 2), 'utf8');
fs.writeFileSync(histFile, JSON.stringify(hist, null, 2), 'utf8');

if (fs.existsSync(bankFile)) {
  const j = JSON.parse(fs.readFileSync(bankFile, 'utf8'));
  j.version = updated;
  j.dailyDate = date;
  fs.writeFileSync(bankFile, JSON.stringify(j, null, 2), 'utf8');
}

console.log(`已生成 ${date} 每日卷：${questions.length} 题（池 ${pool.length} 道，排除最近 4 天 ${recent.length} 个）`);
console.log(questions.map((q) => `${q.id} ${q.板块} ${q.难度} ${q.行业}`).join('\n'));
