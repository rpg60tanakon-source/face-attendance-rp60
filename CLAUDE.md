# ระบบเช็คชื่อด้วยใบหน้าและเข้าสอบ — รร.ราชประชานุเคราะห์ 60

สรุปสำหรับ Claude ในการปรับปรุงครั้งต่อไป · ผู้ใช้/เจ้าของ: นายธนกร วุฒินันท์สุระสิทธิ์ (ครู) · คุยภาษาไทย

## ลิงก์
- เว็บจริง (Netlify, deploy อัตโนมัติเมื่อ push `main`): https://resplendent-nougat-bf0375.netlify.app
- GitHub: `rpg60tanakon-source/face-attendance-rp60`
- Supabase project ref: `jkbswhlpaxymifavdasc` (URL + anon key อยู่ใน `src/config.js`)
- โฟลเดอร์ข้างๆ `../ระบบแจ้งซ่อม` เป็นอีกโปรเจกต์ (ระบบแจ้งซ่อม คนละ repo/คนละ Supabase) — อย่าสับสน

## Stack / โครงสร้าง
- Static site ไม่มี build: React 18 UMD + Babel standalone (`<script type="text/babel">`) + supabase-js + face-api.js + JSZip + Font Awesome 6 (CDN) — ดู `index.html`
- ทุกไฟล์ `.jsx` แชร์ global scope (ฟังก์ชัน/const ระดับบนใช้ข้ามไฟล์ได้) ลำดับโหลดอยู่ท้าย `index.html` — ไฟล์ใหม่ต้องเพิ่ม `<script>` ที่นั่น
- `src/config.js` Supabase, threshold ใบหน้า, รหัส admin (ADMIN_USERNAME/PASSWORD)
- `src/data.jsx` `DB` object (ทุก query Supabase) + `FaceHelper` + ปีการศึกษา (`DB.currentYear()`, `loadCurrentYear`, `setCurrentYear`)
- `src/ui.jsx` Sidebar (`NAV_GROUPS`), MobileBar, PageHeader (ไอคอนจาก `PAGE_ICONS` ตามชื่อหัวเพจ), Card, StatCard, Modal, LoginModal, AdminGate, `useCamera`
- `src/app.jsx` router (state `page`), `isAdmin` (sessionStorage), `requireAdmin(action)`, `showToast`
- `src/exam-data.js` ข้อสอบฝังในโค้ด `window.EXAM_SUBJECTS_BUILTIN` (3 วิชา) · แต่ละวิชามี `rooms: {ห้อง: รหัสผ่าน}` ของตัวเอง
- `src/docx-parser.js` แปลง .docx → ข้อสอบ (ในเบราว์เซอร์)
- Screens: home, register-student, students, register-subject, attendance, reports, exam, exam-results, exam-manage, omr

## UI / ธีม
- ธีมสว่าง สีหลักส้ม `--primary #f47c1c`, สีรองน้ำเงิน `--accent #145da0` — ทุกหน้าใช้ `var(--...)` ปรับธีมที่ `:root` ใน `index.html` จุดเดียว
- เพิ่มเมนู: แก้ `NAV_GROUPS` (ui.jsx) + `case` ใน `renderPage` (app.jsx) + ไอคอนใน `PAGE_ICONS`
- หน้าที่ล็อก admin ห่อด้วย `<AdminGate>`: รายชื่อนักเรียน, รายวิชา, ผลสอบ, จัดการข้อสอบ (`admin: true` ใน NAV_GROUPS แสดง 🔒)
- ชื่อผู้พัฒนาแสดง 2 จุด: ท้าย sidebar (`.sidebar-dev`) + subtitle หน้าหลัก — ผู้ใช้อยากให้เด่น

## ฐานข้อมูล (Supabase, RLS เปิด public ทุก policy)
- `students` (room, number, face_descriptors JSONB, photo_url) · storage bucket `face-photos`
- `subjects` (วิชาสำหรับเช็คชื่อ — คนละอันกับวิชาสอบ)
- `attendance` (+ `academic_year`, `room` = snapshot ห้อง ณ ตอนเช็คชื่อ; unique student+subject+date)
- `exam_results` (subject_code/name, room, score, total, answers JSONB, violations, academic_year, auto_score, needs_grading, graded, manual_scores)
- `exam_subjects` (วิชาสอบที่อัปโหลดผ่านเว็บ: code, name, duration_minutes, rooms, questions)
- `app_settings` (key `current_academic_year`)
- SQL: `supabase-setup.sql` (ตั้งต้น) + `migration-phase-a.sql` + `migration-phase-b1.sql` — **รันครบแล้วทั้งหมด** (รวม UPDATE policy ของ exam_results)

## ระบบสอบ
- Flow: เลือกวิชา → ห้อง → รหัสห้อง → ชื่อ/เลขที่ → สอบ (เต็มจอ, กันคลิกขวา/Ctrl+C/F12, ซ่อนข้อสอบเมื่อ blur/visibility/ออกเต็มจอ แล้วนับ violations)
- วิชาที่แสดง = builtin + `exam_subjects` จาก DB
- คำถาม: `{q, type:"choice", options:{A..D}, answer}` หรือ `{q, type:"text", points, length:"short"|"long", modelAnswer}` (ไม่มี type = choice)
- Parser รองรับ 3 รูปแบบ: `A.`+`Answer: C` / `ก.`+เฉลยรวมท้ายไฟล์ `ข้อ 1. ตอบ ค` / `ก.`+`เฉลย: ข.` ใต้ข้อ · อัตนัย `[อัตนัย 10]` `[อัตนัยยาว 15]` + `แนวคำตอบ:`
- คะแนน: ปรนัย 1/ข้อ อัตโนมัติ; มีอัตนัย → `needs_grading=true, graded=false`; ครูตรวจในหน้าผลสอบ (ปุ่ม 📝 ตรวจ) → `score = auto_score + Σmanual_scores`
- ไฟล์ตัวอย่างให้ครูดาวน์โหลด: `assets/exam-template.docx` (สร้างด้วย npm `docx` ใน scratchpad)
- ระบบทั้งหมดใช้ 4 ตัวเลือก (A–D / ก–ง) — ผู้ใช้ตัดสินใจแล้วว่าไม่เพิ่ม จ

## กระดาษคำตอบ OMR (`src/screens-omr.jsx`, เมนู "กระดาษคำตอบ" key `omr`, admin)
- ก้อน 1 เสร็จ: พิมพ์กระดาษ A4 (SVG หน่วย มม.) ก–ง, เลขประจำตัว 5 หลัก (= `students.student_code`), สูงสุด 100 ข้อ (4 คอลัมน์×25), ข้ออัตนัยแสดงเป็นป้าย ไม่มีวงกลม
- `OMR_LAYOUT` คือพิกัดกลางที่หน้าสแกนต้องใช้ร่วม — **ห้ามเปลี่ยนตำแหน่งหลังครูพิมพ์ไปใช้แล้ว** (มุมดำ 4 มุม center (15,15)(195,15)(15,282)(195,282))
- ก้อน 2 เสร็จ: แท็บ "สแกนตรวจ" (`OmrScanner`) กล้องหลังมือถือ ถ่ายอัตโนมัติเมื่อเจอ 4 มุมนิ่ง 3 เฟรม + ปุ่มเลือกรูป · ตัวอ่าน `src/omr-reader.js` (`OmrReader`, JS ล้วน ไม่มีไลบรารี): adaptive threshold → connected components → ก้อนทึบ (Ixx+Iyy)/A²≈0.167 + มีกระดาษขาวล้อมรอบ → ลองทุกชุด 4 มุม เลือกชุดที่เส้นขอบวงกลมตรงตำแหน่งที่สุด (`fitScore`; เคยเลือกตามขนาดแล้วพลาดเพราะคีย์บอร์ดเป็นฉากหลัง) → homography → สัดส่วนพิกเซลเข้มในวงกลมเทียบสีกระดาษรอบๆ · ตรวจกลับหัวจากหัวกระดาษ · ตัดสินฝนแบบ "เทียบกันเองในแถว" (ความเข้มเทียบวงที่จางสุดในข้อ) ทนเงา/แสงน้อย — เกณฑ์ `FILLED/FAINT/ALL_DARK` · ปุ่ม "บันทึกรูป" ให้ผู้ใช้ส่งภาพจริงมาทดสอบ · ทดสอบด้วยภาพจำลอง (หมุน/เบลอ/ดินสอจาง/กลับหัว) ผ่านหมด — ยังไม่ได้ทดสอบกับกล้องจริง
- ค้นนักเรียนจากเลขประจำตัวด้วย `DB.getStudentByCode` (ไม่ดึง face_descriptors)
- พิมพ์ข้อสอบ (`ExamBooklet`, ไม่มีเฉลย, ตัวเลือก ก–ง, ตัวเลือกสั้นจัดหลายคอลัมน์) — การพิมพ์ใช้ `.print-root` (portal ลูกของ body) + `@page` ตั้งตอนกดพิมพ์ (`PAGE_CSS`: กระดาษคำตอบ margin 0, ข้อสอบ margin 15mm + เลขหน้า)
- ก้อน 3 เสร็จ: ปุ่ม "บันทึกคะแนน" → `exam_results` รูปแบบเดียวกับสอบออนไลน์ (answers = {index: "A".."D"}, violations 0) · กันซ้ำด้วย `DB.findExamResult` (วิชา+ห้อง+เลขที่+ชื่อ+ปี) → ถามแล้ว update ทับ · มีอัตนัย → needs_grading ให้ครูกรอกในหน้าผลสอบ · ไม่ต้องใช้ SQL ใหม่

## วิธีทำงาน / Deploy (สำคัญ)
1. แก้โค้ด → ทดสอบใน Browser pane (preview server ชื่อ `face-attendance`, config อยู่ที่ `../ระบบแจ้งซ่อม/.claude/launch.json`, port 3456)
2. **ถ้าโค้ดใช้คอลัมน์/ตาราง/policy ใหม่: ให้ผู้ใช้รัน SQL ใน Supabase SQL Editor ก่อน แล้วค่อย push** ไม่งั้นเว็บจริงพังช่วงรอ (เคยเกิดมาแล้ว) เขียน SQL แบบรันซ้ำได้ (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`)
3. ทุก operation ใหม่ต้องมี RLS policy (เคยลืม UPDATE ของ exam_results → `.single()` error "Cannot coerce...")
4. commit แล้ว push ด้วย **Bash** (`git push` ใน PowerShell ขอ credential ไม่ได้) → Netlify deploy เอง → บอกผู้ใช้กด Ctrl+Shift+R
5. ทดสอบกับ DB จริงได้ผ่าน `javascript_tool` (เรียก `DB.*`) — ใช้ข้อมูลทดสอบชื่อขึ้นต้น `__` แล้วลบทิ้งเสมอ ห้ามแตะข้อมูลนักเรียนจริง

## เทคนิคทดสอบใน Browser pane
- หน้า admin: `sessionStorage.setItem('isAdmin','1'); location.reload()`
- ตั้งค่า input/select ด้วย native value setter + dispatch `input`/`change` (date input ต้อง `change`)
- `window.confirm = () => true` ก่อนกดส่งข้อสอบ
- Browser pane บล็อกกล้องและ fullscreen — ทดสอบกล้องจริงไม่ได้ (ได้แค่ path ของ error)

## บทเรียน / จุดที่เคยพลาด
- อย่า `Promise.all` ข้อมูลหลักกับข้อมูลเสริม — ถ้าเสริมพัง ข้อมูลหลักหายจากจอ (ผลสอบเคย "หาย")
- `answersRef` ต้องอัปเดตพร้อม state ทันที (`selectAnswer`) ไม่งั้นส่งเร็วได้ 0 คะแนน
- `confirm()` ทำให้ window blur → ต้อง `confirmSafe` (suppressViolationRef) ไม่งั้นนับทุจริตผิด
- เช็คชื่อ: lock id ก่อน await บันทึก (กันบันทึกซ้ำ) + ต้องเจอหน้าเดิม 3 เฟรมติด
- กล้อง: `useCamera` ไล่ลองกล้องทุกตัว + error ไทยพร้อมข้อมูลวินิจฉัย `[ตรวจพบกล้อง N ตัว · รหัส: ...]`
  เคสจริง: Chrome เครื่องครูเห็นกล้อง 0 ตัว (เว็บทดสอบ Google ก็พัง) แต่ Edge ใช้ได้ — กล้อง USB "GENERAL WEBCAM" ใช้ได้ทีละโปรแกรม ปัญหาเป็นของเครื่อง ไม่ใช่โค้ด
- ผู้ใช้ถามว่า "เผลอแก้โค้ดรึเปล่า" → ตอบด้วยหลักฐาน (`git diff` ระหว่างเวอร์ชัน) ไม่ใช่แค่ยืนยันปากเปล่า

## วิธีทำงานกับผู้ใช้ (ที่ชอบ)
- ตอบเป็นภาษาไทย อธิบายให้คนไม่ใช่โปรแกรมเมอร์ทำตามได้ (บอกเมนู/ปุ่มทีละขั้น)
- ผู้ใช้ใช้ Claude Pro และระวังโควตา — งานใหญ่ให้ประเมินขนาดก่อน แบ่งเป็นก้อนที่ commit/deploy ได้ทีละก้อน
- ทดสอบจริงก่อนบอกว่าเสร็จ แล้ว commit + push ทุกครั้ง (ข้อความ commit ภาษาไทย ลงท้าย Co-Authored-By)
- SQL ให้ผู้ใช้รันเองใน Supabase (Claude รันไม่ได้) — ส่งเป็นบล็อกพร้อมคัดลอก

## Hooks อัตโนมัติ (`.claude/settings.json` + `scripts/`)
- SessionStart → `scripts/session-start.js`: `git pull --ff-only` ทุกครั้งที่เปิดเซสชัน (ถ้าพลาด ต้องแจ้งผู้ใช้ก่อนแก้โค้ด)
- PreToolUse Bash|PowerShell → `scripts/pre-push-check.js` (ทำงานเฉพาะคำสั่งที่มี `git push`): parse `src/*.js(x)` ด้วย @babel/parser (ติดตั้งเองครั้งแรกใน `scripts/.tools`, gitignored) ผิด = block · มีไฟล์ `.sql` ใน `@{u}..HEAD` = ถามผู้ใช้ว่ารัน SQL แล้วหรือยัง
- SQL ที่ให้ผู้ใช้รัน ควรบันทึกเป็นไฟล์ `migration-*.sql` ใน repo เสมอ เพื่อให้ hook ตรวจเจอ

## ตั้งค่าเครื่องใหม่ (เช่น เครื่องที่บ้าน)
1. ติดตั้ง Git + Node.js และ Claude (ล็อกอินบัญชีเดิม)
2. `git clone https://github.com/rpg60tanakon-source/face-attendance-rp60.git` แล้วเปิดโฟลเดอร์นี้ใน Claude Code
3. preview: `.claude/launch.json` ในโฟลเดอร์นี้ (`npx serve -l 3456 .`) ชื่อ `face-attendance`
4. push ครั้งแรกจะขอล็อกอิน GitHub (บัญชี rpg60tanakon-source)

## งานค้าง / ไอเดียถัดไป
- ข้อมูลทดสอบที่ยังอยู่: นักเรียนห้อง `ม.999/999` (1 คน), ผลสอบชื่อ `ทดสอบ` (1 รายการ) — ให้ผู้ใช้ตัดสินใจลบ
- หน้าเช็คชื่อยังโหลดนักเรียนทุกคนแล้วค่อยกรองห้อง (~13KB/คน) — ถ้าเกิน ~300 คน ควร query เฉพาะห้อง
- เฉลยข้อสอบอยู่ฝั่ง client (เปิด source เห็นได้) — ถ้าต้องการความปลอดภัยจริงต้องตรวจฝั่ง server (Edge Function)
- รหัส admin อยู่ฝั่ง client — ถ้าต้องการจริงจังใช้ Supabase Auth
