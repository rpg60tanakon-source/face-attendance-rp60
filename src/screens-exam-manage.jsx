/* ===== จัดการข้อสอบ: อัปโหลด .docx / แก้ไข / ลบ (สำหรับครู) ===== */
function ScreenExamManage({ showToast }) {
  const [subjects, setSubjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [parsing, setParsing] = React.useState(false);

  const [form, setForm] = React.useState({ code: "", name: "", duration: 60 });
  const [roomRows, setRoomRows] = React.useState([{ room: "", password: "" }]);
  const [questions, setQuestions] = React.useState([]);
  const [issues, setIssues] = React.useState([]);
  const [fileName, setFileName] = React.useState("");
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const fileRef = React.useRef(null);

  const loadData = async () => {
    setLoading(true);
    try { setSubjects(await DB.getExamSubjects()); }
    catch (e) { showToast("โหลดรายการข้อสอบไม่สำเร็จ: " + (e.message || ""), "error"); }
    setLoading(false);
  };
  React.useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setForm({ code: "", name: "", duration: 60 });
    setRoomRows([{ room: "", password: "" }]);
    setQuestions([]); setIssues([]); setFileName("");
    setEditId(null); setShowForm(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setParsing(true); setIssues([]);
    try {
      const res = await window.DocxExamParser.parseFile(file);
      setQuestions(res.questions);
      setIssues(res.issues);
      setFileName(file.name);
      if (res.issues.length === 0) {
        showToast(`อ่านข้อสอบสำเร็จ ${res.count} ข้อ`, "success");
      } else {
        showToast(`อ่านได้ ${res.count} ข้อ แต่พบปัญหา ${res.issues.length} จุด`, "error");
      }
      // เดาชื่อวิชาจากชื่อไฟล์ ถ้ายังไม่ได้กรอก
      if (!form.name) {
        const guess = file.name.replace(/\.docx$/i, "").replace(/[_]+/g, " ").trim();
        setForm(f => ({ ...f, name: f.name || guess }));
      }
    } catch (err) {
      showToast("อ่านไฟล์ไม่สำเร็จ: " + err.message, "error");
      setQuestions([]); setFileName("");
    }
    setParsing(false);
  };

  const setRoomRow = (i, key, val) =>
    setRoomRows(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  const addRoomRow = () => setRoomRows(rows => [...rows, { room: "", password: "" }]);
  const removeRoomRow = (i) => setRoomRows(rows => rows.filter((_, idx) => idx !== i));

  const openEdit = (s) => {
    setEditId(s.id);
    setForm({ code: s.code, name: s.name, duration: s.duration_minutes });
    const rows = Object.entries(s.rooms || {}).map(([room, password]) => ({ room, password }));
    setRoomRows(rows.length ? rows : [{ room: "", password: "" }]);
    setQuestions(s.questions || []);
    setIssues([]); setFileName(`(ข้อสอบเดิม ${(s.questions || []).length} ข้อ)`);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { showToast("กรุณากรอกรหัสวิชา", "error"); return; }
    if (!form.name.trim()) { showToast("กรุณากรอกชื่อวิชา", "error"); return; }
    if (questions.length === 0) { showToast("กรุณาอัปโหลดไฟล์ข้อสอบ", "error"); return; }
    const rooms = {};
    roomRows.forEach(r => { if (r.room.trim() && r.password.trim()) rooms[r.room.trim()] = r.password.trim(); });
    if (Object.keys(rooms).length === 0) { showToast("กรุณากรอกห้องและรหัสผ่านอย่างน้อย 1 ห้อง", "error"); return; }
    if (issues.length > 0 && !confirm(`ข้อสอบมีปัญหา ${issues.length} จุด ต้องการบันทึกต่อหรือไม่?`)) return;

    setSaving(true);
    const payload = {
      code: form.code.trim(), name: form.name.trim(),
      duration_minutes: parseInt(form.duration) || 60,
      rooms, questions,
    };
    try {
      if (editId) { await DB.updateExamSubject(editId, payload); showToast("แก้ไขข้อสอบสำเร็จ", "success"); }
      else { await DB.createExamSubject(payload); showToast("เพิ่มข้อสอบสำเร็จ", "success"); }
      resetForm(); loadData();
    } catch (e) {
      const msg = (e.message || "") + (e.details ? " " + e.details : "");
      showToast(msg.includes("duplicate") ? "รหัสวิชานี้มีอยู่แล้ว" : "บันทึกไม่สำเร็จ: " + msg, "error");
    }
    setSaving(false);
  };

  const handleDelete = async (s) => {
    if (!confirm(`ต้องการลบข้อสอบ "${s.code} - ${s.name}" หรือไม่?\n(ผลสอบที่นักเรียนทำไว้จะไม่ถูกลบ)`)) return;
    try { await DB.deleteExamSubject(s.id); showToast("ลบข้อสอบสำเร็จ", "success"); loadData(); }
    catch (e) { showToast("ลบไม่สำเร็จ: " + (e.message || ""), "error"); }
  };

  if (loading) return <LoadingSpinner text="กำลังโหลดรายการข้อสอบ..." />;

  const builtIn = window.EXAM_SUBJECTS_BUILTIN || [];

  return (
    <div className="page-enter" style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
      <PageHeader
        title="จัดการข้อสอบ"
        subtitle="อัปโหลดไฟล์ข้อสอบ .docx เพื่อเพิ่มวิชาสอบใหม่"
        actions={<button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ อัปโหลดข้อสอบ</button>}
      />

      {/* วิชาที่อัปโหลดไว้ */}
      <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>
        ข้อสอบที่อัปโหลด ({subjects.length})
      </h3>
      {subjects.length === 0 ? (
        <EmptyState icon="📤" title="ยังไม่มีข้อสอบที่อัปโหลด"
          description="กดปุ่ม 'อัปโหลดข้อสอบ' เพื่อเพิ่มวิชาใหม่จากไฟล์ Word" />
      ) : (
        <div style={{ display: "grid", gap: 12, marginBottom: 28 }}>
          {subjects.map(s => (
            <Card key={s.id} className="reveal" style={{ display: "flex", alignItems: "center", gap: 14, borderLeft: "3px solid var(--primary)" }}>
              <div style={{ fontSize: 30 }}>📝</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                  <span className="mono">{s.code}</span> · {(s.questions || []).length} ข้อ · {s.duration_minutes} นาที
                </div>
                <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}>
                  🏫 {Object.keys(s.rooms || {}).join(", ")}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDelete(s)}>🗑️</button>
            </Card>
          ))}
        </div>
      )}

      {/* วิชาที่ฝังมากับระบบ */}
      {builtIn.length > 0 && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>
            ข้อสอบที่ฝังมากับระบบ ({builtIn.length})
          </h3>
          <div style={{ display: "grid", gap: 8 }}>
            {builtIn.map(s => (
              <Card key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, opacity: 0.75 }}>
                <div style={{ fontSize: 24 }}>🔒</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    <span className="mono">{s.code}</span> · {s.questions.length} ข้อ · 🏫 {Object.keys(s.rooms || {}).join(", ")}
                  </div>
                </div>
                <span className="chip">แก้ไขในโค้ดเท่านั้น</span>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ฟอร์มอัปโหลด/แก้ไข */}
      <Modal open={showForm} onClose={resetForm} wide title={editId ? "แก้ไขข้อสอบ" : "อัปโหลดข้อสอบใหม่"}>
        {/* 1. ไฟล์ */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label>1. ไฟล์ข้อสอบ (.docx)</label>
          <input ref={fileRef} type="file" accept=".docx" className="input" onChange={handleFile} disabled={parsing} />
          {parsing && <span style={{ fontSize: 13, color: "var(--text-dim)" }}>กำลังอ่านไฟล์...</span>}
          {fileName && !parsing && (
            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="chip" style={{
                color: issues.length ? "var(--warn)" : "var(--success)",
                background: issues.length ? "var(--warn-soft)" : "var(--success-soft)",
              }}>
                {issues.length ? "⚠️" : "✓"} {fileName} · {questions.length} ข้อ
              </span>
              {questions.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewOpen(true)}>🔍 ดูตัวอย่าง</button>
              )}
            </div>
          )}
          {issues.length > 0 && (
            <div style={{
              marginTop: 10, padding: "10px 14px", borderRadius: 10, fontSize: 12,
              background: "var(--warn-soft)", border: "1px solid rgba(250,204,21,0.3)",
              color: "var(--text-dim)", maxHeight: 120, overflowY: "auto",
            }}>
              <strong style={{ color: "var(--warn)" }}>พบปัญหา {issues.length} จุด:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {issues.slice(0, 10).map((it, i) => <li key={i}>{it}</li>)}
                {issues.length > 10 && <li>... และอีก {issues.length - 10} จุด</li>}
              </ul>
            </div>
          )}
        </div>

        {/* 2. ข้อมูลวิชา */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">
            <label>2. รหัสวิชา</label>
            <input className="input" placeholder="เช่น ว31251" value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="field">
            <label>เวลาสอบ (นาที)</label>
            <input className="input" type="number" value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          </div>
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>ชื่อวิชา</label>
          <input className="input" placeholder="เช่น การเขียนโปรแกรม ม.5" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        {/* 3. ห้อง + รหัสผ่าน */}
        <div className="field" style={{ marginBottom: 20 }}>
          <label>3. ห้องที่สอบ และรหัสผ่านของแต่ละห้อง</label>
          {roomRows.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input className="input" placeholder="ห้อง เช่น ม.5/1" value={r.room}
                onChange={e => setRoomRow(i, "room", e.target.value)} />
              <input className="input" placeholder="รหัสผ่าน" value={r.password}
                onChange={e => setRoomRow(i, "password", e.target.value)} />
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", flexShrink: 0 }}
                onClick={() => removeRoomRow(i)} disabled={roomRows.length === 1}>✕</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addRoomRow}>+ เพิ่มห้อง</button>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={resetForm}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || parsing}>
            {saving ? "กำลังบันทึก..." : editId ? "💾 บันทึกการแก้ไข" : "💾 บันทึกข้อสอบ"}
          </button>
        </div>
      </Modal>

      {/* ตัวอย่างข้อสอบ */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} wide
        title={`ตัวอย่างข้อสอบ (${questions.length} ข้อ)`}>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {questions.map((q, i) => (
            <div key={i} style={{
              padding: "12px 14px", marginBottom: 10, borderRadius: 10,
              background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>{i + 1}. {q.q}</div>
              <div style={{ display: "grid", gap: 4, paddingLeft: 12 }}>
                {["A", "B", "C", "D"].map(o => (
                  <div key={o} style={{
                    fontSize: 13,
                    color: q.answer === o ? "var(--success)" : "var(--text-dim)",
                    fontWeight: q.answer === o ? 600 : 400,
                  }}>
                    {o}. {q.options[o] || <span style={{ color: "var(--danger)" }}>(ไม่มีตัวเลือก)</span>}
                    {q.answer === o && " ✓"}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
