// ===== ตั้งค่า Supabase =====
// 1. ไปที่ https://supabase.com/dashboard → สร้าง Project ใหม่
// 2. ไปที่ Project Settings → API
// 3. คัดลอก "Project URL" มาใส่ SUPABASE_URL
// 4. คัดลอก "anon / public" key มาใส่ SUPABASE_ANON_KEY
// 5. ไปที่ SQL Editor → รัน supabase-setup.sql
// 6. ไปที่ Storage → สร้าง bucket ชื่อ "face-photos" แบบ Public

window.SUPABASE_URL      = "https://jkbswhlpaxymifavdasc.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYnN3aGxwYXh5bWlmYXZkYXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NjA4ODcsImV4cCI6MjA5NzIzNjg4N30.43sWn_o79-piNvQLq4voCE2RByFLB4IHjtWyqJ0_-0g";

// ===== ตั้งค่า Face Recognition =====
window.FACE_API_MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
// ค่ายิ่งต่ำ = ยิ่งเข้มงวด (จับคู่ผิดยากขึ้น แต่ถ้าต่ำไปอาจไม่จับคู่คนจริง)
// แนะนำ 0.45-0.50 — ปรับขึ้นถ้าคนจริงไม่ถูกจับ, ปรับลงถ้าจับผิดคน
window.FACE_MATCH_THRESHOLD = 0.48;
