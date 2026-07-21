/* ===== แปลงไฟล์ข้อสอบ .docx เป็นข้อมูลข้อสอบ (ทำงานในเบราว์เซอร์) =====
   รองรับ 3 รูปแบบ:
   1) A. ตัวเลือก ... + "Answer: C"
   2) ก. ตัวเลือก ... + เฉลยรวมท้ายไฟล์ "ข้อ 1. ตอบ ค"
   3) ก. ตัวเลือก ... + เฉลยใต้แต่ละข้อ "เฉลย: ข. ..."
*/
window.DocxExamParser = {
  TH2EN: { "ก": "A", "ข": "B", "ค": "C", "ง": "D" },

  // ---- ดึงย่อหน้าข้อความจากไฟล์ .docx ----
  async extractParagraphs(file) {
    if (typeof JSZip === "undefined") throw new Error("ไม่พบไลบรารี JSZip");
    const zip = await JSZip.loadAsync(file);
    const docFile = zip.file("word/document.xml");
    if (!docFile) throw new Error("ไฟล์นี้ไม่ใช่ .docx ที่ถูกต้อง (ไม่พบ word/document.xml)");
    const xml = await docFile.async("string");

    const paras = xml.split("</w:p>");
    const out = [];
    for (const p of paras) {
      const texts = p.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [];
      let line = texts
        .map(t => t.replace(/<w:t[^>]*>/, "").replace(/<\/w:t>/, ""))
        .join("");
      line = line
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/ /g, " ")
        .trim();
      if (line) out.push(line);
    }
    return out;
  },

  // ---- แปลงย่อหน้าเป็นชุดคำถาม ----
  parseLines(lines) {
    const questions = [];
    let cur = null;
    let inKeySection = false;
    const keyAnswers = {}; // เลขข้อ -> A/B/C/D

    const isHeader = (ln) =>
      /^(ข้อสอบ|ตอนที่|หมวดที่|แบบทดสอบ|คำชี้แจง|วิชา)/.test(ln);

    for (const raw of lines) {
      const ln = raw.trim();
      if (!ln) continue;

      // เริ่มส่วนเฉลยรวมท้ายไฟล์ ("เฉลยข้อสอบ", "เฉลย") — ต้องไม่ใช่ "เฉลย: ..."
      if (/^เฉลย(?!\s*[:：])/.test(ln)) { inKeySection = true; continue; }

      if (inKeySection) {
        const mk = ln.match(/^ข้อ\s*(\d+)\.?\s*ตอบ\s*([กขคงABCD])/i);
        if (mk) {
          const letter = mk[2];
          keyAnswers[parseInt(mk[1])] = this.TH2EN[letter] || letter.toUpperCase();
        }
        continue;
      }

      if (isHeader(ln)) continue;

      // เฉลยใต้ข้อ: "เฉลย: ข. ..." หรือ "Answer: C"
      const mInlineTh = ln.match(/^เฉลย\s*[:：]\s*([กขคง])/);
      const mInlineEn = ln.match(/^Answer\s*[:：]\s*([ABCD])/i);
      if ((mInlineTh || mInlineEn) && cur) {
        cur.answer = mInlineTh ? this.TH2EN[mInlineTh[1]] : mInlineEn[1].toUpperCase();
        continue;
      }

      // ตัวเลือก: "A. ..." หรือ "ก. ..."
      const mOpt = ln.match(/^([ABCDกขคง])[\.\)]\s*(.+)$/);
      if (mOpt && cur) {
        const key = this.TH2EN[mOpt[1]] || mOpt[1].toUpperCase();
        cur.options[key] = mOpt[2].trim();
        continue;
      }

      // คำถาม: "1. ..."
      const mQ = ln.match(/^(\d+)[\.\)]\s*(.+)$/);
      if (mQ) {
        if (cur) questions.push(cur);
        cur = { no: parseInt(mQ[1]), q: mQ[2].trim(), options: {}, answer: null };
        continue;
      }

      // บรรทัดต่อเนื่องของคำถาม (คำถามยาวขึ้นบรรทัดใหม่)
      if (cur && Object.keys(cur.options).length === 0) {
        cur.q += " " + ln;
      }
    }
    if (cur) questions.push(cur);

    // เติมเฉลยจากส่วนเฉลยรวม (ถ้ามี)
    for (const q of questions) {
      if (!q.answer && keyAnswers[q.no]) q.answer = keyAnswers[q.no];
    }

    return questions;
  },

  // ---- ตรวจความถูกต้อง + สรุปปัญหา ----
  validate(questions) {
    const issues = [];
    questions.forEach(q => {
      const optCount = Object.keys(q.options).length;
      if (optCount !== 4) issues.push(`ข้อ ${q.no}: มี ${optCount} ตัวเลือก (ต้องมี 4)`);
      if (!q.answer) issues.push(`ข้อ ${q.no}: ไม่พบเฉลย`);
      else if (!q.options[q.answer]) issues.push(`ข้อ ${q.no}: เฉลยเป็น ${q.answer} แต่ไม่มีตัวเลือกนั้น`);
    });
    return issues;
  },

  // ---- ใช้งานหลัก: ไฟล์ -> { questions, issues } ----
  async parseFile(file) {
    const lines = await this.extractParagraphs(file);
    const parsed = this.parseLines(lines);
    if (parsed.length === 0) {
      throw new Error("ไม่พบข้อสอบในไฟล์ — ตรวจสอบว่าข้อสอบขึ้นต้นด้วย '1.' และตัวเลือกเป็น A./ก.");
    }
    const issues = this.validate(parsed);
    const questions = parsed.map(q => ({ q: q.q, options: q.options, answer: q.answer }));
    return { questions, issues, count: questions.length };
  },
};
