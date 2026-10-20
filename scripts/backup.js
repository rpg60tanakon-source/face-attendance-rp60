// สำรองข้อมูล Supabase ลงเครื่อง (และโฟลเดอร์ Google Drive ถ้ามี)
//   node scripts/backup.js [--out <โฟลเดอร์>]...   (ใส่ --out ได้หลายครั้ง)
// ต่อการสำรอง 1 ครั้ง ได้โฟลเดอร์ <out>/YYYY-MM-DD/ มี:
//   json/<ตาราง>.json  ข้อมูลครบทุกคอลัมน์ (รวมข้อมูลใบหน้า — ใช้กู้คืนได้)
//   csv/<ตาราง>.csv    เปิดด้วย Excel ได้ (ไม่มีข้อมูลใบหน้า)
//   photos/            รูปใบหน้าจาก storage bucket face-photos
// เก็บไว้ล่าสุด KEEP ชุด ชุดที่เก่ากว่านั้นลบทิ้งอัตโนมัติ
// การเรียกข้อมูลทุกครั้งนับเป็นการใช้งาน → ช่วยกันโปรเจกต์ฟรีถูกพักเมื่อไม่มีคนใช้ 1 สัปดาห์
const fs = require("fs");
const path = require("path");
const os = require("os");

const KEEP = 12;
// ตาราง → คอลัมน์ที่ใช้เรียงลำดับ (ต้องเรียงคงที่ ไม่งั้นแบ่งหน้าแล้วแถวซ้ำ/หาย)
const TABLES = { students: "id", subjects: "id", attendance: "id", exam_results: "id", exam_subjects: "id", app_settings: "key" };
const BUCKET = "face-photos";
const ROOT = path.join(__dirname, "..");

const cfg = fs.readFileSync(path.join(ROOT, "src", "config.js"), "utf8");
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*"([^"]+)"/) || [])[1];
const KEY = (cfg.match(/SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/) || [])[1];
if (!URL_ || !KEY) { console.error("อ่าน SUPABASE_URL / SUPABASE_ANON_KEY จาก src/config.js ไม่ได้"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const outs = [];
for (let i = 2; i < process.argv.length; i++) if (process.argv[i] === "--out") outs.push(process.argv[++i]);
if (!outs.length) {
  outs.push(path.join(os.homedir(), "Documents", "face-attendance-backups"));
  // Google Drive for desktop: โฟลเดอร์ "ไดรฟ์ของฉัน" ซิงก์ขึ้นคลาวด์เอง (ชื่อโฟลเดอร์ขึ้นกับภาษาของเครื่อง)
  const drive = ["G:\\My Drive", "G:\\ไดรฟ์ของฉัน", path.join(os.homedir(), "Google Drive", "My Drive")]
    .find(p => fs.existsSync(p));
  if (drive) outs.push(path.join(drive, "face-attendance-backups"));
  else console.warn("ไม่พบโฟลเดอร์ Google Drive (ยังไม่ได้ติดตั้ง Google Drive for desktop?) — สำรองเฉพาะในเครื่อง");
}

async function getJson(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${url}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// ดึงทุกแถว (REST คืนได้ครั้งละไม่เกิน 1000 แถว → แบ่งหน้า)
async function fetchTable(t, orderCol) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const page = await getJson(`${URL_}/rest/v1/${t}?select=*&order=${orderCol}.asc`, {
      headers: { Range: `${from}-${from + 999}`, "Range-Unit": "items" },
    });
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function listBucket(prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const items = await getJson(`${URL_}/storage/v1/object/list/${BUCKET}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    for (const it of items) {
      const p = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) files.push(...await listBucket(p)); // โฟลเดอร์ย่อย
      else files.push(p);
    }
    if (items.length < 1000) return files;
  }
}

const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function toCsv(rows) {
  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(c => c !== "face_descriptors");
  // BOM ให้ Excel อ่านภาษาไทยถูก
  return "﻿" + [cols.join(","), ...rows.map(r => cols.map(c => csvCell(r[c])).join(","))].join("\r\n");
}

(async () => {
  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }); // YYYY-MM-DD
  const data = {};
  for (const [t, col] of Object.entries(TABLES)) data[t] = await fetchTable(t, col);
  const photos = [];
  for (const name of await listBucket()) {
    const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name.split("/").map(encodeURIComponent).join("/")}`, { headers: H });
    if (r.ok) photos.push({ name, buf: Buffer.from(await r.arrayBuffer()) });
    else console.warn(`ดาวน์โหลดรูปไม่ได้: ${name} (${r.status})`);
  }

  for (const out of outs) {
    const dir = path.join(out, day);
    for (const sub of ["json", "csv", "photos"]) fs.mkdirSync(path.join(dir, sub), { recursive: true });
    for (const t in TABLES) {
      fs.writeFileSync(path.join(dir, "json", `${t}.json`), JSON.stringify(data[t], null, 1));
      fs.writeFileSync(path.join(dir, "csv", `${t}.csv`), toCsv(data[t]));
    }
    for (const p of photos) {
      const f = path.join(dir, "photos", ...p.name.split("/"));
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, p.buf);
    }
    const summary = Object.keys(TABLES).map(t => `${t}: ${data[t].length} แถว`).join("\n") + `\nรูปใบหน้า: ${photos.length} ไฟล์\n`;
    fs.writeFileSync(path.join(dir, "สรุป.txt"), `สำรองเมื่อ ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}\n${summary}`);

    // ลบชุดเก่า เก็บไว้ KEEP ชุดล่าสุด (เฉพาะโฟลเดอร์ชื่อวันที่ที่สคริปต์นี้สร้าง)
    const sets = fs.readdirSync(out).filter(n => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort();
    for (const old of sets.slice(0, Math.max(0, sets.length - KEEP))) fs.rmSync(path.join(out, old), { recursive: true, force: true });

    console.log(`สำรองแล้ว → ${dir}\n${summary}`);
  }
})().catch(e => { console.error("สำรองข้อมูลไม่สำเร็จ:", e.message); process.exit(1); });
