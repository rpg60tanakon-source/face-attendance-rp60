/* ===== Data Layer ===== */
const SUPABASE_CONFIGURED = window.SUPABASE_URL && window.SUPABASE_URL !== "YOUR_SUPABASE_URL";
const sb = SUPABASE_CONFIGURED
  ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

const _fallbackYear = () => String(new Date().getFullYear() + 543); // ค.ศ. -> พ.ศ.
let _currentYear = null;

const DB = {
  isConfigured() { return SUPABASE_CONFIGURED; },

  // ---------- ปีการศึกษา (app_settings) ----------
  async loadCurrentYear() {
    if (!sb) { _currentYear = _fallbackYear(); return _currentYear; }
    try {
      const { data } = await sb.from("app_settings").select("value").eq("key", "current_academic_year");
      _currentYear = (data && data[0] && data[0].value) || _fallbackYear();
    } catch (e) { _currentYear = _fallbackYear(); }
    return _currentYear;
  },
  currentYear() { return _currentYear || _fallbackYear(); },
  async setCurrentYear(year) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { error } = await sb.from("app_settings")
      .upsert({ key: "current_academic_year", value: String(year) }, { onConflict: "key" });
    if (error) throw error;
    _currentYear = String(year);
  },

  // ---------- Students ----------
  async getStudents() {
    if (!sb) return [];
    const { data, error } = await sb.from("students").select("*").order("room").order("number");
    if (error) throw error;
    return data;
  },
  // รายชื่อแบบเบา (ไม่มีข้อมูลใบหน้า ~13KB/คน) — ใช้แสดงชื่อ/รูป/รายการห้อง
  async getStudentsLight() {
    if (!sb) return [];
    const { data, error } = await sb.from("students")
      .select("id, student_code, prefix, first_name, last_name, room, number, photo_url")
      .order("room").order("number");
    if (error) throw error;
    return data;
  },
  async getStudentsByRoom(room) {
    if (!sb) return [];
    const { data, error } = await sb.from("students").select("*").eq("room", room).order("number");
    if (error) throw error;
    return data;
  },
  // ค้นนักเรียนจากเลขประจำตัว (ไม่ดึงข้อมูลใบหน้า — เบา)
  async getStudentByCode(code) {
    if (!sb) return null;
    const { data, error } = await sb.from("students")
      .select("id, student_code, prefix, first_name, last_name, room, number")
      .eq("student_code", code).maybeSingle();
    if (error) throw error;
    return data;
  },
  async getStudent(id) {
    if (!sb) return null;
    const { data, error } = await sb.from("students").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },
  async createStudent(student) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("students").insert(student).select().single();
    if (error) throw error;
    return data;
  },
  async updateStudent(id, updates) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("students").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteStudent(id) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { error } = await sb.from("students").delete().eq("id", id);
    if (error) throw error;
  },
  // เลื่อนชั้น: ย้ายนักเรียนทั้งห้องไปห้องใหม่ (ประวัติเก่าไม่กระทบ เพราะ snapshot ห้องไว้แล้ว)
  async promoteRoom(fromRoom, toRoom) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("students")
      .update({ room: toRoom, updated_at: new Date().toISOString() })
      .eq("room", fromRoom).select();
    if (error) throw error;
    return data;
  },
  // ย้ายนักเรียนที่เลือก (รายคน) ไปห้องใหม่
  async setStudentsRoom(ids, toRoom) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    if (!ids || ids.length === 0) return [];
    const { data, error } = await sb.from("students")
      .update({ room: toRoom, updated_at: new Date().toISOString() })
      .in("id", ids).select();
    if (error) throw error;
    return data;
  },

  // ---------- Subjects ----------
  async getSubjects() {
    if (!sb) return [];
    const { data, error } = await sb.from("subjects").select("*").order("subject_code");
    if (error) throw error;
    return data;
  },
  async createSubject(subject) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("subjects").insert(subject).select().single();
    if (error) throw error;
    return data;
  },
  async updateSubject(id, updates) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("subjects").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteSubject(id) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { error } = await sb.from("subjects").delete().eq("id", id);
    if (error) throw error;
  },

  // ---------- Attendance ----------
  async getAttendance(filters = {}) {
    if (!sb) return [];
    let q = sb.from("attendance").select("*, students(*), subjects(*)");
    if (filters.date) q = q.eq("check_date", filters.date);
    if (filters.year) q = q.eq("academic_year", filters.year);
    if (filters.subject_id) q = q.eq("subject_id", filters.subject_id);
    if (filters.student_id) q = q.eq("student_id", filters.student_id);
    q = q.order("check_time", { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async markAttendance(record) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("attendance").upsert(record, { onConflict: "student_id,subject_id,check_date" }).select("*, students(*), subjects(*)").single();
    if (error) throw error;
    return data;
  },
  async deleteAttendance(id) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { error } = await sb.from("attendance").delete().eq("id", id);
    if (error) throw error;
  },

  // ---------- Exam Results ----------
  async saveExamResult(record) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("exam_results").insert(record).select().single();
    if (error) throw error;
    return data;
  },
  // หาผลสอบเดิมของนักเรียนคนนี้ในวิชานี้ (ปีการศึกษาปัจจุบัน) — กันสแกนกระดาษคำตอบซ้ำ
  async findExamResult({ subject_code, room, student_number, student_name }) {
    if (!sb) return null;
    const { data, error } = await sb.from("exam_results")
      .select("id, score, total, submitted_at")
      .eq("subject_code", subject_code).eq("room", room)
      .eq("student_number", student_number).eq("student_name", student_name)
      .eq("academic_year", this.currentYear())
      .order("submitted_at", { ascending: false }).limit(1);
    if (error) throw error;
    return data[0] || null;
  },
  async getExamResults(filters = {}) {
    if (!sb) return [];
    let q = sb.from("exam_results").select("*");
    if (filters.room) q = q.eq("room", filters.room);
    if (filters.date) q = q.eq("exam_date", filters.date);
    if (filters.year) q = q.eq("academic_year", filters.year);
    q = q.order("submitted_at", { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  // ---------- Exam Subjects (วิชาสอบที่อัปโหลดผ่านเว็บ) ----------
  async getExamSubjects() {
    if (!sb) return [];
    const { data, error } = await sb.from("exam_subjects").select("*").order("code");
    if (error) throw error;
    return data;
  },
  async createExamSubject(subject) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("exam_subjects").insert(subject).select().single();
    if (error) throw error;
    return data;
  },
  async updateExamSubject(id, updates) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("exam_subjects")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async deleteExamSubject(id) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { error } = await sb.from("exam_subjects").delete().eq("id", id);
    if (error) throw error;
  },
  async deleteExamResult(id) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { error } = await sb.from("exam_results").delete().eq("id", id);
    if (error) throw error;
  },
  // บันทึกผลการตรวจข้ออัตนัยของครู
  async updateExamResult(id, updates) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.from("exam_results").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  // ---------- Storage ----------
  async uploadPhoto(file, path) {
    if (!sb) throw new Error("กรุณาตั้งค่า Supabase ก่อน");
    const { data, error } = await sb.storage.from("face-photos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = sb.storage.from("face-photos").getPublicUrl(path);
    return urlData.publicUrl;
  },

  // ---------- Stats ----------
  async getStats() {
    if (!sb) return { totalStudents: 0, totalSubjects: 0, todayAttendance: 0 };
    const [students, subjects, todayAtt] = await Promise.all([
      sb.from("students").select("id", { count: "exact", head: true }),
      sb.from("subjects").select("id", { count: "exact", head: true }),
      sb.from("attendance").select("id", { count: "exact", head: true }).eq("check_date", new Date().toISOString().split("T")[0]),
    ]);
    return {
      totalStudents: students.count || 0,
      totalSubjects: subjects.count || 0,
      todayAttendance: todayAtt.count || 0,
    };
  },

  async getRooms() {
    if (!sb) return [];
    const { data, error } = await sb.from("students").select("room").order("room");
    if (error) throw error;
    return [...new Set(data.map(d => d.room))];
  },

  // รายชื่อปีการศึกษาที่มีข้อมูล (จากตาราง attendance หรือ exam_results)
  async getYears(table) {
    if (!sb) return [];
    const { data, error } = await sb.from(table).select("academic_year");
    if (error) throw error;
    return [...new Set((data || []).map(d => d.academic_year).filter(Boolean))].sort().reverse();
  }
};

// ---------- Face API Helper ----------
const FaceHelper = {
  modelsLoaded: false,

  async loadModels() {
    if (this.modelsLoaded) return;
    const url = window.FACE_API_MODEL_URL;
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(url),
      faceapi.nets.faceLandmark68Net.loadFromUri(url),
      faceapi.nets.faceRecognitionNet.loadFromUri(url),
    ]);
    this.modelsLoaded = true;
  },

  async detectFace(input) {
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection;
  },

  async detectAllFaces(input) {
    const detections = await faceapi
      .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    return detections;
  },

  createMatcher(students) {
    const labeled = students
      .filter(s => s.face_descriptors && s.face_descriptors.length > 0)
      .map(s => {
        const descriptors = s.face_descriptors.map(d => new Float32Array(d));
        return new faceapi.LabeledFaceDescriptors(s.id, descriptors);
      });
    if (labeled.length === 0) return null;
    return new faceapi.FaceMatcher(labeled, window.FACE_MATCH_THRESHOLD);
  },

  drawDetections(canvas, detections, matchResults, studentsMap) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det, i) => {
      const box = det.detection.box;
      const match = matchResults ? matchResults[i] : null;
      const matched = match && match.label !== "unknown";

      ctx.strokeStyle = matched ? "#4ade80" : "#ff6b8a";
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      if (matched && studentsMap) {
        const student = studentsMap[match.label];
        if (student) {
          const label = `${student.prefix}${student.first_name} ${student.last_name}`;
          const conf = ((1 - match.distance) * 100).toFixed(0) + "%";
          ctx.fillStyle = "rgba(74, 222, 128, 0.85)";
          const textW = ctx.measureText(label + " " + conf).width + 16;
          ctx.fillRect(box.x, box.y - 30, textW, 28);
          ctx.fillStyle = "#000";
          ctx.font = "bold 14px 'IBM Plex Sans Thai', sans-serif";
          ctx.fillText(label + " " + conf, box.x + 8, box.y - 10);
        }
      } else if (!matched) {
        ctx.fillStyle = "rgba(255, 107, 138, 0.85)";
        ctx.fillRect(box.x, box.y - 30, 100, 28);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px 'IBM Plex Sans Thai', sans-serif";
        ctx.fillText("ไม่รู้จัก", box.x + 8, box.y - 10);
      }
    });
  },

  canvasToBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
  }
};
