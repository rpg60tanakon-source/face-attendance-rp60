-- ============================================================
-- เฟส B1: รองรับข้อสอบอัตนัย (คอลัมน์สำหรับการตรวจ)
-- รันใน Supabase → SQL Editor (รันซ้ำได้ ไม่ทำลายข้อมูลเดิม)
-- ============================================================

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS auto_score    INTEGER;   -- คะแนนปรนัย (ตรวจอัตโนมัติ)
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS needs_grading BOOLEAN DEFAULT false;  -- มีข้ออัตนัยที่ต้องตรวจ
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS graded        BOOLEAN DEFAULT true;   -- ตรวจครบแล้วหรือยัง
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS manual_scores JSONB;    -- คะแนนอัตนัยที่ครูให้ {ข้อ: คะแนน}

-- ข้อมูลเดิม (ปรนัยล้วน) = ตรวจครบแล้ว
UPDATE exam_results SET auto_score = score WHERE auto_score IS NULL;
UPDATE exam_results SET graded = true      WHERE graded IS NULL;
UPDATE exam_results SET needs_grading = false WHERE needs_grading IS NULL;
