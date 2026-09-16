-- ============================================================
-- เฟส A: ปีการศึกษา + snapshot ห้อง + เลื่อนชั้น
-- รันใน Supabase → SQL Editor (รันซ้ำได้ ไม่ทำลายข้อมูลเดิม)
-- ============================================================

-- 1) เพิ่มคอลัมน์ปีการศึกษา และ snapshot ห้อง (สำหรับเก็บห้อง ณ ตอนบันทึก)
ALTER TABLE attendance   ADD COLUMN IF NOT EXISTS academic_year VARCHAR(4);
ALTER TABLE attendance   ADD COLUMN IF NOT EXISTS room VARCHAR(20);
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS academic_year VARCHAR(4);

-- 2) เติมข้อมูลเดิม: ตั้งเป็นปี 2569 และ snapshot ห้องจากข้อมูลนักเรียนปัจจุบัน
UPDATE attendance SET academic_year = '2569' WHERE academic_year IS NULL;
UPDATE attendance a SET room = s.room FROM students s
  WHERE a.room IS NULL AND a.student_id = s.id;
UPDATE exam_results SET academic_year = '2569' WHERE academic_year IS NULL;

-- 3) Index สำหรับกรองตามปี
CREATE INDEX IF NOT EXISTS idx_attendance_year ON attendance(academic_year);
CREATE INDEX IF NOT EXISTS idx_exam_year       ON exam_results(academic_year);

-- 4) ตารางตั้งค่าระบบ (เก็บปีการศึกษาปัจจุบัน)
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read app_settings"   ON app_settings;
DROP POLICY IF EXISTS "Public insert app_settings" ON app_settings;
DROP POLICY IF EXISTS "Public update app_settings" ON app_settings;
CREATE POLICY "Public read app_settings"   ON app_settings FOR SELECT USING (true);
CREATE POLICY "Public insert app_settings" ON app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update app_settings" ON app_settings FOR UPDATE USING (true);

INSERT INTO app_settings (key, value) VALUES ('current_academic_year', '2569')
  ON CONFLICT (key) DO NOTHING;
