/* ===== Home / Dashboard ===== */
function ScreenHome({ onNavigate }) {
  const [stats, setStats] = React.useState(null);
  const [modelsReady, setModelsReady] = React.useState(FaceHelper.modelsLoaded);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const s = await DB.getStats();
        setStats(s);
      } catch (e) { console.error(e); }

      try {
        await FaceHelper.loadModels();
        setModelsReady(true);
      } catch (e) { console.error("โหลด Face Models ไม่สำเร็จ:", e); }

      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner text="กำลังโหลดระบบ & โมเดล AI..." />;

  const quickLinks = [
    { key: "register-student", icon: "👤", title: "ลงทะเบียนนักเรียน", desc: "เพิ่มนักเรียนใหม่พร้อมถ่ายรูปใบหน้า", color: "var(--primary)" },
    { key: "register-subject", icon: "📚", title: "จัดการรายวิชา", desc: "เพิ่ม/แก้ไขรายวิชาสำหรับเช็คชื่อ", color: "var(--accent)" },
    { key: "attendance", icon: "📷", title: "เช็คชื่อด้วยใบหน้า", desc: "สแกนใบหน้าเพื่อบันทึกเข้าเรียน", color: "var(--success)" },
    { key: "reports", icon: "📊", title: "รายงานการเข้าเรียน", desc: "ดูสถิติและประวัติการเช็คชื่อ", color: "var(--info)" },
  ];

  return (
    <div className="page-enter" style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px" }}>
      <PageHeader title="ระบบเช็คชื่อด้วยใบหน้า" subtitle="Face Recognition Attendance System" />

      {/* Setup warning */}
      {!DB.isConfigured() && (
        <Card style={{
          marginBottom: 24, borderLeft: "3px solid var(--warn)",
          background: "var(--warn-soft)",
        }}>
          <h3 style={{ margin: "0 0 8px", color: "var(--warn)", fontSize: 16 }}>⚠️ ยังไม่ได้ตั้งค่า Supabase</h3>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-dim)" }}>กรุณาทำตามขั้นตอนนี้:</p>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.8 }}>
            <li>ไปที่ <strong>supabase.com</strong> → สร้างโปรเจกต์ใหม่</li>
            <li>ไปที่ <strong>SQL Editor</strong> → รันไฟล์ <code>supabase-setup.sql</code></li>
            <li>ไปที่ <strong>Storage</strong> → สร้าง bucket ชื่อ <code>face-photos</code> แบบ Public</li>
            <li>ไปที่ <strong>Project Settings → API</strong> → คัดลอก URL และ Key</li>
            <li>แก้ไขไฟล์ <code>src/config.js</code> ใส่ URL และ Key</li>
          </ol>
        </Card>
      )}

      {/* Model status */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 16px", borderRadius: 12, marginBottom: 24,
        background: modelsReady ? "var(--success-soft)" : "var(--warn-soft)",
        border: `1px solid ${modelsReady ? "rgba(74,222,128,0.3)" : "rgba(250,204,21,0.3)"}`,
        fontSize: 14,
      }}>
        <span style={{ color: modelsReady ? "var(--success)" : "var(--warn)" }}>
          {modelsReady ? "✓" : "⏳"}
        </span>
        <span>
          {modelsReady
            ? "โมเดล AI พร้อมใช้งาน — ระบบตรวจจับใบหน้าพร้อมแล้ว"
            : "กำลังโหลดโมเดล AI กรุณารอสักครู่..."}
        </span>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
          <StatCard icon="👥" label="นักเรียนทั้งหมด" value={stats.totalStudents} color="var(--primary)" />
          <StatCard icon="📚" label="รายวิชาทั้งหมด" value={stats.totalSubjects} color="var(--accent)" />
          <StatCard icon="✅" label="เช็คชื่อวันนี้" value={stats.todayAttendance} color="var(--success)" />
        </div>
      )}

      {/* Quick links */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>เมนูหลัก</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {quickLinks.map(link => (
          <Card
            key={link.key}
            className="reveal"
            style={{ cursor: "pointer", borderLeft: `3px solid ${link.color}` }}
            onClick={() => onNavigate(link.key)}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>{link.icon}</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>{link.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>{link.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
