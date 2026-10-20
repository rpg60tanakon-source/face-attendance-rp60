// Hook SessionStart: ดึงโค้ดล่าสุดจาก GitHub ทุกครั้งที่เปิดงาน (ทำงาน 2 เครื่อง กันงานชนกัน)
const { execSync } = require("child_process");
const run = (cmd) => execSync(cmd, { cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 25000 }).trim();

let msg;
try {
  const before = run("git rev-parse HEAD");
  run("git pull --ff-only");
  const after = run("git rev-parse HEAD");
  if (before === after) {
    msg = "git pull: โค้ดเป็นเวอร์ชันล่าสุดอยู่แล้ว";
  } else {
    const log = run(`git log --oneline ${before}..${after}`);
    msg = `git pull: ดึงงานใหม่จากอีกเครื่องมาแล้ว ${log.split("\n").length} commit:\n${log}`;
  }
} catch (e) {
  const err = ((e.stderr || "") + (e.stdout || "") || e.message).trim().split("\n").slice(-3).join(" ");
  msg = `git pull ไม่สำเร็จ — แจ้งผู้ใช้ก่อนเริ่มแก้โค้ด (อาจมีไฟล์ที่ยังไม่ commit, งานสองเครื่องแยกทางกัน หรือไม่มีเน็ต): ${err}`;
}
process.stdout.write(JSON.stringify({
  systemMessage: msg.split("\n")[0],
  hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: msg },
}));
