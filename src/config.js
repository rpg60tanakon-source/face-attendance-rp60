// ===== ตั้งค่า Supabase =====
// 1. ไปที่ https://supabase.com/dashboard → สร้าง Project ใหม่
// 2. ไปที่ Project Settings → API
// 3. คัดลอก "Project URL" มาใส่ SUPABASE_URL
// 4. คัดลอก "anon / public" key มาใส่ SUPABASE_ANON_KEY
// 5. ไปที่ SQL Editor → รัน supabase-setup.sql
// 6. ไปที่ Storage → สร้าง bucket ชื่อ "face-photos" แบบ Public

window.SUPABASE_URL      = "YOUR_SUPABASE_URL";
window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// ===== ตั้งค่า Face Recognition =====
window.FACE_API_MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
window.FACE_MATCH_THRESHOLD = 0.5;
