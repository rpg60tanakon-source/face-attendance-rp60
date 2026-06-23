/* ===== Student List / Management ===== */
function ScreenStudents({ onNavigate, showToast, isAdmin, requireAdmin }) {
  const [students, setStudents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filterRoom, setFilterRoom] = React.useState("");
  const [rooms, setRooms] = React.useState([]);
  const [editStudent, setEditStudent] = React.useState(null);
  const [editForm, setEditForm] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([DB.getStudents(), DB.getRooms()]);
      setStudents(s);
      setRooms(r);
    } catch (e) { showToast("โหลดข้อมูลไม่สำเร็จ", "error"); }
    setLoading(false);
  };

  React.useEffect(() => { loadData(); }, []);

  const filtered = students.filter(s => {
    const matchSearch = !search || `${s.student_code} ${s.prefix}${s.first_name} ${s.last_name} ${s.room}`
      .toLowerCase().includes(search.toLowerCase());
    const matchRoom = !filterRoom || s.room === filterRoom;
    return matchSearch && matchRoom;
  });

  const handleDelete = (id) => requireAdmin(async () => {
    if (!confirm("ต้องการลบนักเรียนนี้หรือไม่?")) return;
    try {
      await DB.deleteStudent(id);
      showToast("ลบนักเรียนสำเร็จ", "success");
      loadData();
    } catch (e) { showToast("ลบไม่สำเร็จ", "error"); }
  });

  const openEdit = (student) => requireAdmin(() => {
    setEditStudent(student);
    setEditForm({
      student_code: student.student_code,
      prefix: student.prefix,
      first_name: student.first_name,
      last_name: student.last_name,
      room: student.room,
      number: student.number,
    });
  });

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await DB.updateStudent(editStudent.id, {
        ...editForm,
        number: parseInt(editForm.number),
      });
      showToast("อัพเดทสำเร็จ", "success");
      setEditStudent(null);
      loadData();
    } catch (e) { showToast("อัพเดทไม่สำเร็จ: " + e.message, "error"); }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-enter" style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px" }}>
      <PageHeader
        title="รายชื่อนักเรียน"
        subtitle={`ทั้งหมด ${students.length} คน`}
        actions={
          <button className="btn btn-primary" onClick={() => onNavigate("register-student")}>
            + เพิ่มนักเรียน
          </button>
        }
      />

      {/* Filters */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label>ค้นหา</label>
            <input className="input" placeholder="ค้นหาชื่อ, รหัส, ห้อง..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 140 }}>
            <label>กรองตามห้อง</label>
            <select className="select" value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Student list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="👥"
          title="ไม่พบนักเรียน"
          description={students.length === 0 ? "ยังไม่มีนักเรียนในระบบ" : "ไม่พบผลลัพธ์ที่ค้นหา"}
          action={students.length === 0 && (
            <button className="btn btn-primary" onClick={() => onNavigate("register-student")}>
              + ลงทะเบียนนักเรียนคนแรก
            </button>
          )}
        />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                <th style={thStyle}>รูป</th>
                <th style={thStyle}>รหัส</th>
                <th style={thStyle}>ชื่อ-นามสกุล</th>
                <th style={thStyle}>ห้อง</th>
                <th style={thStyle}>เลขที่</th>
                <th style={thStyle}>Face</th>
                <th style={thStyle}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={tdStyle}>
                    {s.photo_url ? (
                      <img src={s.photo_url} style={{
                        width: 40, height: 40, borderRadius: 8, objectFit: "cover",
                      }} />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: 8,
                        background: "var(--surface-strong)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18,
                      }}>👤</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span className="mono" style={{ fontSize: 13 }}>{s.student_code}</span>
                  </td>
                  <td style={tdStyle}>{s.prefix}{s.first_name} {s.last_name}</td>
                  <td style={tdStyle}>{s.room}</td>
                  <td style={tdStyle}>{s.number}</td>
                  <td style={tdStyle}>
                    <span className="chip" style={{
                      background: s.face_descriptors?.length > 0 ? "var(--success-soft)" : "var(--danger-soft)",
                      color: s.face_descriptors?.length > 0 ? "var(--success)" : "var(--danger)",
                      borderColor: s.face_descriptors?.length > 0 ? "rgba(74,222,128,0.3)" : "rgba(255,107,138,0.3)",
                    }}>
                      {s.face_descriptors?.length > 0 ? `✓ ${s.face_descriptors.length} รูป` : "✗ ยังไม่มี"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)}
                        style={{ color: "var(--danger)" }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal open={!!editStudent} onClose={() => setEditStudent(null)} title="แก้ไขข้อมูลนักเรียน">
        {editStudent && (
          <div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>รหัสนักเรียน</label>
              <input className="input" value={editForm.student_code}
                onChange={e => setEditForm(f => ({ ...f, student_code: e.target.value }))} />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>คำนำหน้า</label>
              <select className="select" value={editForm.prefix}
                onChange={e => setEditForm(f => ({ ...f, prefix: e.target.value }))}>
                {["เด็กชาย","เด็กหญิง","นาย","นางสาว"].map(p =>
                  <option key={p} value={p}>{p}</option>
                )}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div className="field">
                <label>ชื่อ</label>
                <input className="input" value={editForm.first_name}
                  onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="field">
                <label>นามสกุล</label>
                <input className="input" value={editForm.last_name}
                  onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div className="field">
                <label>ห้อง</label>
                <input className="input" value={editForm.room}
                  onChange={e => setEditForm(f => ({ ...f, room: e.target.value }))} />
              </div>
              <div className="field">
                <label>เลขที่</label>
                <input className="input" type="number" value={editForm.number}
                  onChange={e => setEditForm(f => ({ ...f, number: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setEditStudent(null)}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const thStyle = { padding: "12px 14px", textAlign: "left", fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 };
const tdStyle = { padding: "10px 14px", verticalAlign: "middle" };
