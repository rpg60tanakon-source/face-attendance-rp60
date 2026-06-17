/* ===== Subject Registration ===== */
function ScreenRegisterSubject({ showToast }) {
  const [subjects, setSubjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ subject_code: "", subject_name: "", teacher_name: "" });
  const [saving, setSaving] = React.useState(false);
  const [editId, setEditId] = React.useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await DB.getSubjects();
      setSubjects(s);
    } catch (e) { showToast("โหลดข้อมูลไม่สำเร็จ", "error"); }
    setLoading(false);
  };

  React.useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setForm({ subject_code: "", subject_name: "", teacher_name: "" });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.subject_code || !form.subject_name) {
      showToast("กรุณากรอกรหัสวิชาและชื่อวิชา", "error");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await DB.updateSubject(editId, form);
        showToast("อัพเดทรายวิชาสำเร็จ", "success");
      } else {
        await DB.createSubject(form);
        showToast("เพิ่มรายวิชาสำเร็จ", "success");
      }
      resetForm();
      loadData();
    } catch (e) {
      showToast("เกิดข้อผิดพลาด: " + (e.message || e.details), "error");
    }
    setSaving(false);
  };

  const handleEdit = (subject) => {
    setForm({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      teacher_name: subject.teacher_name || "",
    });
    setEditId(subject.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("ต้องการลบรายวิชานี้หรือไม่? (ข้อมูลเช็คชื่อที่เกี่ยวข้องจะถูกลบด้วย)")) return;
    try {
      await DB.deleteSubject(id);
      showToast("ลบรายวิชาสำเร็จ", "success");
      loadData();
    } catch (e) { showToast("ลบไม่สำเร็จ", "error"); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-enter" style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>
      <PageHeader
        title="จัดการรายวิชา"
        subtitle={`ทั้งหมด ${subjects.length} วิชา`}
        actions={
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            + เพิ่มรายวิชา
          </button>
        }
      />

      {/* Add/Edit Form */}
      <Modal open={showForm} onClose={resetForm} title={editId ? "แก้ไขรายวิชา" : "เพิ่มรายวิชาใหม่"}>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>รหัสวิชา</label>
          <input className="input" placeholder="เช่น ว21101" value={form.subject_code}
            onChange={e => setForm(f => ({ ...f, subject_code: e.target.value }))} />
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>ชื่อวิชา</label>
          <input className="input" placeholder="เช่น วิทยาศาสตร์พื้นฐาน" value={form.subject_name}
            onChange={e => setForm(f => ({ ...f, subject_name: e.target.value }))} />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label>ชื่อครูผู้สอน (ไม่บังคับ)</label>
          <input className="input" placeholder="เช่น อ.สมชาย" value={form.teacher_name}
            onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={resetForm}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "กำลังบันทึก..." : editId ? "💾 อัพเดท" : "💾 เพิ่มรายวิชา"}
          </button>
        </div>
      </Modal>

      {/* Subject list */}
      {subjects.length === 0 ? (
        <EmptyState
          icon="📚"
          title="ยังไม่มีรายวิชา"
          description="เพิ่มรายวิชาเพื่อใช้ในการเช็คชื่อ"
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + เพิ่มรายวิชาแรก
            </button>
          }
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {subjects.map(s => (
            <Card key={s.id} className="reveal" style={{
              display: "flex", alignItems: "center", gap: 16,
              borderLeft: "3px solid var(--accent)",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "var(--accent-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, flexShrink: 0,
              }}>📚</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{s.subject_name}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 13, color: "var(--text-dim)" }}>
                  <span className="mono">{s.subject_code}</span>
                  {s.teacher_name && <span>👨‍🏫 {s.teacher_name}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(s)}>✏️</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)}
                  style={{ color: "var(--danger)" }}>🗑️</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
