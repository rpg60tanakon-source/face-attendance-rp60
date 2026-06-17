-- ===================================================
-- ระบบเช็คชื่อด้วยใบหน้า - Supabase Database Setup
-- รร.ราชประชานุเคราะห์ 60
-- ===================================================

-- 1) ตารางนักเรียน
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_code VARCHAR(20) NOT NULL UNIQUE,
  prefix VARCHAR(20) NOT NULL DEFAULT 'เด็กชาย',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  room VARCHAR(20) NOT NULL,
  number INTEGER NOT NULL,
  face_descriptors JSONB DEFAULT '[]'::jsonb,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) ตารางรายวิชา
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_code VARCHAR(20) NOT NULL UNIQUE,
  subject_name VARCHAR(200) NOT NULL,
  teacher_name VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) ตารางบันทึกการเช็คชื่อ
CREATE TABLE attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_time TIME NOT NULL DEFAULT CURRENT_TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  confidence FLOAT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, check_date)
);

-- 4) Indexes
CREATE INDEX idx_attendance_date ON attendance(check_date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_subject ON attendance(subject_id);
CREATE INDEX idx_students_room ON students(room);

-- 5) RLS Policies (เปิด public access สำหรับใช้ภายในโรงเรียน)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read students"  ON students  FOR SELECT USING (true);
CREATE POLICY "Public write students" ON students  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update students" ON students FOR UPDATE USING (true);
CREATE POLICY "Public delete students" ON students FOR DELETE USING (true);

CREATE POLICY "Public read subjects"  ON subjects  FOR SELECT USING (true);
CREATE POLICY "Public write subjects" ON subjects  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update subjects" ON subjects FOR UPDATE USING (true);
CREATE POLICY "Public delete subjects" ON subjects FOR DELETE USING (true);

CREATE POLICY "Public read attendance"  ON attendance  FOR SELECT USING (true);
CREATE POLICY "Public write attendance" ON attendance  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update attendance" ON attendance FOR UPDATE USING (true);
CREATE POLICY "Public delete attendance" ON attendance FOR DELETE USING (true);

-- 6) Storage bucket สำหรับรูปภาพ
-- ไปที่ Supabase Dashboard → Storage → สร้าง bucket ชื่อ "face-photos" แบบ Public
