-- Phase C: สถานที่เรียน (เลือกตอนสแกนหน้าเช็คชื่อ แสดงในรายงานการเข้าเรียน)
-- รันซ้ำได้ ไม่กระทบข้อมูลเดิม (แถวเก่าจะเป็นค่าว่าง = "ไม่ระบุ")
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS location VARCHAR(100);
