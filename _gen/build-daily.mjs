// GitHub Actions 每日任务：生成当天 daily.json，并更新 bank.json 版本号
// 用法：node _gen/build-daily.mjs [仓库根目录]
import fs from 'node:fs';
import path from 'node:path';
import { makeDaily } from './daily.mjs';

const ROOT = process.argv[2] || process.cwd();
const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
const questions = makeDaily(date).map((q) => ({ ...q, key: `${date}-${q.id}` }));
const updated = new Date().toISOString();

const daily = { date, updated, count: questions.length, questions };
fs.writeFileSync(path.join(ROOT, 'daily.json'), JSON.stringify(daily, null, 2), 'utf8');

const bankFile = path.join(ROOT, 'bank.json');
if (fs.existsSync(bankFile)) {
  const j = JSON.parse(fs.readFileSync(bankFile, 'utf8'));
  j.version = updated;
  j.dailyDate = date;
  fs.writeFileSync(bankFile, JSON.stringify(j, null, 2), 'utf8');
}

console.log(`已生成 ${date} 每日卷：${questions.length} 题`);
console.log(questions.map((q) => `${q.id} ${q.板块} ${q.难度} ${q.行业}`).join('\n'));
