/* ===== Attendance Reports ===== */
function ScreenReports({ showToast }) {
  const [subjects, setSubjects] = React.useState([]);
  const [rooms, setRooms] = React.useState([]);
  const [attendance, setAttendance] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filterDate, setFilterDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [filterSubject, setFilterSubject] = React.useState("");
  const [filterRoom, setFilterRoom] = React.useState("");
  const [sortBy, setSortBy] = React.useState("time-desc");

  React.useEffect(() => {
    (async () => {
      try {
        const [subs, rms] = await Promise.all([DB.getSubjects(), DB.getRooms()]);
        setSubjects(subs);
        setRooms(rms);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (filterDate) filters.date = filterDate;
      if (filterSubject) filters.subject_id = filterSubject;
      const data = await DB.getAttendance(filters);
      setAttendance(data);
    } catch (e) { showToast("โหลดข้อมูลไม่สำเร็จ", "error"); }
    setLoading(false);
  };

  React.useEffect(() => { if (!loading) loadAttendance(); }, [filterDate, filterSubject]);

  const filtered = attendance.filter(a => {
    if (filterRoom && a.students?.room !== filterRoom) return false;
    return true;
  });

  const stats = React.useMemo(() => {
    const byRoom = {};
    filtered.forEach(a => {
      const room = a.students?.room || "ไม่ระบุ";
      if (!byRoom[room]) byRoom[room] = 0;
      byRoom[room]++;
    });
    return { total: filtered.length, byRoom };
  }, [filtered]);

  // เรียงลำดับข้อมูลตามที่เลือก
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "number") {
      // เรียงตามห้อง แล้วตามเลขที่ (น้อย→มาก) ในแต่ละห้อง
      // ปรับห้องให้เทียบกันโดยไม่สนใจจุด/ช่องว่าง (กันกรณีพิมพ์ "ม.4/2" กับ "ม4/2")
      const normRoom = s => (s || "").replace(/[\s.]/g, "");
      arr.sort((a, b) => {
        const ra = normRoom(a.students?.room);
        const rb = normRoom(b.students?.room);
        if (ra !== rb) return ra.localeCompare(rb, "th", { numeric: true });
        return (a.students?.number || 0) - (b.students?.number || 0);
      });
    } else if (sortBy === "time-asc") {
      arr.sort((a, b) => (a.check_time || "").localeCompare(b.check_time || ""));
    } else {
      // time-desc (ค่าเริ่มต้น): ล่าสุดก่อน
      arr.sort((a, b) => (b.check_time || "").localeCompare(a.check_time || ""));
    }
    return arr;
  }, [filtered, sortBy]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showToast("ไม่มีข้อมูลให้ดาวน์โหลด", "error");
      return;
    }

    const headers = ["วันที่", "เวลา", "รหัสนักเรียน", "ชื่อ-นามสกุล", "ห้อง", "เลขที่", "รายวิชา", "สถานะ", "ความมั่นใจ"];
    const rows = sorted.map(a => [
      a.check_date,
      a.check_time,
      a.students?.student_code || "",
      `${a.students?.prefix || ""}${a.students?.first_name || ""} ${a.students?.last_name || ""}`,
      a.students?.room || "",
      a.students?.number || "",
      a.subjects?.subject_name || "",
      a.status === "present" ? "มา" : a.status === "late" ? "สาย" : "ขาด",
      a.confidence ? (a.confidence * 100).toFixed(1) + "%" : "",
    ]);

    const BOM = "﻿";
    const csv = BOM + [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${filterDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ดาวน์โหลด CSV สำเร็จ", "success");
  };

  return (
    <div className="page-enter" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
      <PageHeader
        title="รายงานการเข้าเรียน"
        subtitle="ดูสถิติและประวัติการเช็คชื่อ"
        actions={
          <button className="btn btn-accent" onClick={handleExportCSV}>
            📥 ดาวน์โหลด CSV
          </button>
        }
      />

      {/* Filters */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ minWidth: 160 }}>
            <label>วันที่</label>
            <input className="input" type="date" value={filterDate}
              onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label>รายวิชา</label>
            <select className="select" value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}>
              <option value="">ทุกวิชา</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 130 }}>
            <label>ห้อง</label>
            <select className="select" value={filterRoom}
              onChange={e => setFilterRoom(e.target.value)}>
              <option value="">ทุกห้อง</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 190 }}>
            <label>เรียงลำดับ</label>
            <select className="select" value={sortBy}
              onChange={e => setSortBy(e.target.value)}>
              <option value="time-desc">เวลา (ล่าสุด → เก่า)</option>
              <option value="time-asc">เวลา (เก่า → ล่าสุด)</option>
              <option value="number">เลขที่ (ในแต่ละห้อง)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard icon="✅" label="เช็คชื่อทั้งหมด" value={stats.total} color="var(--success)" />
        {Object.entries(stats.byRoom).slice(0, 3).map(([room, count]) => (
          <StatCard key={room} icon="🏫" label={room} value={count} color="var(--primary)" />
        ))}
      </div>

      {/* Attendance table */}
      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon="📊" title="ไม่พบข้อมูล" description="ไม่มีข้อมูลเช็คชื่อตามเงื่อนไขที่เลือก" />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  <th style={rThStyle}>#</th>
                  <th style={rThStyle}>เวลา</th>
                  <th style={rThStyle}>รูป</th>
                  <th style={rThStyle}>รหัส</th>
                  <th style={rThStyle}>ชื่อ-นามสกุล</th>
                  <th style={rThStyle}>ห้อง</th>
                  <th style={rThStyle}>เลขที่</th>
                  <th style={rThStyle}>รายวิชา</th>
                  <th style={rThStyle}>สถานะ</th>
                  <th style={rThStyle}>ความมั่นใจ</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={rTdStyle}>{i + 1}</td>
                    <td style={rTdStyle}>
                      <span className="mono" style={{ fontSize: 13 }}>
                        {a.check_time ? a.check_time.substring(0, 5) : "-"}
                      </span>
                    </td>
                    <td style={rTdStyle}>
                      {a.students?.photo_url ? (
                        <img src={a.students.photo_url} style={{
                          width: 36, height: 36, borderRadius: 8, objectFit: "cover",
                        }} />
                      ) : <span>👤</span>}
                    </td>
                    <td style={rTdStyle}>
                      <span className="mono" style={{ fontSize: 13 }}>{a.students?.student_code}</span>
                    </td>
                    <td style={rTdStyle}>
                      {a.students?.prefix}{a.students?.first_name} {a.students?.last_name}
                    </td>
                    <td style={rTdStyle}>{a.students?.room}</td>
                    <td style={rTdStyle}>{a.students?.number}</td>
                    <td style={rTdStyle}>
                      <span style={{ fontSize: 12 }}>
                        {a.subjects?.subject_code} {a.subjects?.subject_name}
                      </span>
                    </td>
                    <td style={rTdStyle}>
                      <span className="status s-done" style={{ height: 24, fontSize: 11 }}>
                        <span className="pulse"></span>
                        {a.status === "present" ? "มา" : a.status === "late" ? "สาย" : "ขาด"}
                      </span>
                    </td>
                    <td style={rTdStyle}>
                      {a.confidence ? (
                        <span style={{
                          color: a.confidence > 0.7 ? "var(--success)" : a.confidence > 0.5 ? "var(--warn)" : "var(--danger)",
                          fontWeight: 600, fontSize: 13,
                        }}>
                          {(a.confidence * 100).toFixed(1)}%
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

const rThStyle = { padding: "12px 12px", textAlign: "left", fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, whiteSpace: "nowrap" };
const rTdStyle = { padding: "10px 12px", verticalAlign: "middle" };
