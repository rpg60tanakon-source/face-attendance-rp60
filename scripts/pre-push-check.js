// Hook PreToolUse (Bash/PowerShell): ก่อน git push
// 1) ตรวจไวยากรณ์ไฟล์ .js/.jsx ทุกไฟล์ใน src/ — เว็บไม่มี build ถ้าพิมพ์ผิดตัวเดียว เว็บจริงจะขึ้นจอขาว → ห้าม push
// 2) ถ้ามีไฟล์ .sql ใหม่ในงานที่จะ push → ถามผู้ใช้ก่อนว่ารัน SQL ใน Supabase แล้วหรือยัง
// ใช้ @babel/parser (ติดตั้งให้อัตโนมัติครั้งแรกใน scripts/.tools — ไม่ถูก commit)
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
const cmd = (input.tool_input && input.tool_input.command) || "";
if (!/\bgit\s+push\b/.test(cmd)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const sh = (c) => execSync(c, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

// ---- 1) ตรวจไวยากรณ์ ----
const toolsDir = path.join(__dirname, ".tools");
let parser;
try {
  parser = require(path.join(toolsDir, "node_modules", "@babel/parser"));
} catch (e) {
  try {
    fs.mkdirSync(toolsDir, { recursive: true });
    execSync("npm install --prefix . --no-save --silent @babel/parser@7", { cwd: toolsDir, stdio: "ignore", timeout: 90000 });
    parser = require(path.join(toolsDir, "node_modules", "@babel/parser"));
  } catch (e2) {
    process.stderr.write("ตรวจไวยากรณ์ไม่ได้ (ติดตั้ง @babel/parser ไม่สำเร็จ — ไม่มีเน็ต?) จึงยังไม่ push: " + e2.message);
    process.exit(2);
  }
}

const srcDir = path.join(root, "src");
const errors = [];
for (const f of fs.readdirSync(srcDir).filter(f => /\.(jsx?|mjs)$/.test(f))) {
  const code = fs.readFileSync(path.join(srcDir, f), "utf8");
  try {
    parser.parse(code, { sourceType: "script", plugins: f.endsWith(".jsx") ? ["jsx"] : [], errorRecovery: false });
  } catch (e) {
    errors.push(`src/${f} บรรทัด ${e.loc ? e.loc.line + ":" + e.loc.column : "?"} — ${e.message}`);
  }
}
if (errors.length) {
  process.stderr.write("ห้าม push: โค้ดมีไวยากรณ์ผิด (เว็บจริงจะขึ้นจอขาว) แก้ก่อนแล้วค่อย push\n" + errors.join("\n"));
  process.exit(2);
}

// ---- 2) มี SQL ใหม่ในงานที่จะ push? ----
let sqlFiles = [];
try {
  sqlFiles = sh("git diff --name-only --diff-filter=AM @{u}..HEAD").split("\n").filter(f => /\.sql$/i.test(f));
} catch (e) { /* ไม่มี upstream — ข้าม */ }
if (sqlFiles.length) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: `งานนี้มีไฟล์ SQL ใหม่/แก้ไข: ${sqlFiles.join(", ")} — รัน SQL นี้ใน Supabase SQL Editor แล้วหรือยัง? ถ้ายัง ให้กดปฏิเสธแล้วรันก่อน (ไม่งั้นเว็บจริงอาจพังช่วงรอ)`,
    },
  }));
}
process.exit(0);
