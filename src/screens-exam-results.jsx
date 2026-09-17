/* ===== Exam Results (สำหรับครู) ===== */
function ScreenExamResults({ showToast }) {
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filterRoom, setFilterRoom] = React.useState("");
  const [filterDate, setFilterDate] = React.useState("");
  const [filterSubject, setFilterSubject] = React.useState("");
  const [filterYear, setFilterYear] = React.useState(DB.currentYear());
  const [filterStatus, setFilterStatus] = React.useState("");
  const [sortBy, setSortBy] = React.useState("number");
  const [detail, setDetail] = React.useState(null);
  const [gradeScores, setGradeScores] = React.useState({}); // {qIndex: points} ที่ครูกรอก
  const [grading, setGrading] = React.useState(false);

  const [examSubjects, setExamSubjects] = React.useState(window.EXAM_SUBJECTS_BUILTIN || []);

  // หาเฉลย/ข้อสอบต้นฉบับของวิชานั้น (สำหรับ modal ตรวจ)
  const questionsFor = (subjectCode) => {
    const s = examSubjects.find(x => x.code === subjectCode);
    return s ? s.questions : [];
  };

  // เปิด modal ตรวจ/ดูคำตอบ — โหลดคะแนนอัตนัยที่เคยให้ไว้
  const openDetail = (r) => {
    setGradeScores(r.manual_scores || {});
    setDetail(r);
  };

  // บันทึกผลการตรวจข้ออัตนัย
  const saveGrading = async () => {
    if (!detail) return;
    const qs = questionsFor(detail.subject_code);
    const manual = {};
    let subjSum = 0;
    qs.forEach((q, i) => {
      if (q.type === "text") {
        const pts = Math.max(0, Math.min(q.points || 1, Number(gradeScores[i]) || 0));
        manual[i] = pts; subjSum += pts;
      }
    });
    const finalScore = (detail.auto_score != null ? detail.auto_score : detail.score) + subjSum;
    setGrading(true);
    try {
      await DB.updateExamResult(detail.id, { manual_scores: manual, score: finalScore, graded: true });
      setResults(prev => prev.map(r => r.id === detail.id
        ? { ...r, manual_scores: manual, score: finalScore, graded: true } : r));
      showToast(`บันทึกคะแนนแล้ว — รวม ${finalScore}/${detail.total}`, "success");
      setDetail(null);
    } catch (e) { showToast("บันทึกไม่สำเร็จ: " + (e.message || ""), "error"); }
    setGrading(false);
  };

  const loadData = async () => {
    setLoading(true);
    await DB.loadCurrentYear();
    // โหลดผลสอบ (สำคัญที่สุด) — แยกจากการโหลดวิชา เพื่อไม่ให้พังตามกัน
    try {
      setResults(await DB.getExamResults());
    } catch (e) {
      showToast("โหลดผลสอบไม่สำเร็จ: " + (e.message || ""), "error");
    }
    // โหลดรายการวิชา (ใช้แค่ตอนดูเฉลยรายข้อ) — ถ้าล้มเหลวยังแสดงผลสอบได้ตามปกติ
    try {
      const dbSubs = await DB.getExamSubjects();
      setExamSubjects([
        ...(window.EXAM_SUBJECTS_BUILTIN || []),
        ...dbSubs.map(r => ({ code: r.code, name: r.name, rooms: r.rooms || {}, questions: r.questions || [] })),
      ]);
    } catch (e) {
      console.warn("โหลดวิชาจากฐานข้อมูลไม่ได้ (ใช้เฉพาะวิชาที่ฝังในโค้ด):", e.message);
      setExamSubjects(window.EXAM_SUBJECTS_BUILTIN || []);
    }
    setLoading(false);
  };

  const handleDelete = async (r) => {
    if (!confirm(`ต้องการลบผลสอบของ "${r.student_name}" (${r.room} เลขที่ ${r.student_number}) คะแนน ${r.score}/${r.total} หรือไม่?`)) return;
    try {
      await DB.deleteExamResult(r.id);
      setResults(prev => prev.filter(x => x.id !== r.id));
      if (detail && detail.id === r.id) setDetail(null);
      showToast("ลบผลสอบแล้ว", "success");
    } catch (e) { showToast("ลบไม่สำเร็จ: " + (e.message || ""), "error"); }
  };

  const handleDeleteFiltered = async () => {
    if (sorted.length === 0) { showToast("ไม่มีข้อมูลให้ลบ", "error"); return; }
    const scope = [filterYear && `ปี ${filterYear}`, filterSubject && `วิชา ${filterSubject}`, filterRoom && `ห้อง ${filterRoom}`, filterDate && `วันที่ ${filterDate}`]
      .filter(Boolean).join(" · ") || "ทั้งหมด";
    if (!confirm(`ต้องการลบผลสอบ ${sorted.length} รายการ (${scope}) หรือไม่?\n\n⚠️ การลบไม่สามารถกู้คืนได้`)) return;
    if (!confirm(`ยืนยันอีกครั้ง: ลบ ${sorted.length} รายการถาวร?`)) return;
    try {
      const ids = sorted.map(r => r.id);
      for (const id of ids) await DB.deleteExamResult(id);
      setResults(prev => prev.filter(x => !ids.includes(x.id)));
      showToast(`ลบผลสอบ ${ids.length} รายการแล้ว`, "success");
    } catch (e) { showToast("ลบไม่สำเร็จ: " + (e.message || ""), "error"); }
  };

  React.useEffect(() => { loadData(); }, []);

  const rooms = React.useMemo(() => {
    const fromData = results.map(r => r.room).filter(Boolean);
    const fromConfig = examSubjects.flatMap(s => Object.keys(s.rooms || {}));
    return [...new Set([...fromConfig, ...fromData])]
      .sort((a, b) => a.localeCompare(b, "th", { numeric: true }));
  }, [results]);

  const dates = React.useMemo(() => {
    return [...new Set(results.map(r => r.exam_date).filter(Boolean))].sort().reverse();
  }, [results]);

  const subjectCodes = React.useMemo(() => {
    return [...new Set(results.map(r => r.subject_code).filter(Boolean))].sort();
  }, [results]);

  const years = React.useMemo(() => {
    const list = [...new Set(results.map(r => r.academic_year).filter(Boolean))].sort().reverse();
    if (!list.includes(DB.currentYear())) list.unshift(DB.currentYear());
    return list;
  }, [results]);

  const filtered = React.useMemo(() => {
    return results.filter(r => {
      if (filterYear && (r.academic_year || "") !== filterYear) return false;
      if (filterRoom && r.room !== filterRoom) return false;
      if (filterDate && r.exam_date !== filterDate) return false;
      if (filterSubject && r.subject_code !== filterSubject) return false;
      const pending = r.needs_grading && !r.graded;
      if (filterStatus === "pending" && !pending) return false;
      if (filterStatus === "graded" && pending) return false;
      return true;
    });
  }, [results, filterYear, filterRoom, filterDate, filterSubject, filterStatus]);

  const pendingCount = React.useMemo(
    () => results.filter(r => r.needs_grading && !r.graded).length, [results]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "number") {
      arr.sort((a, b) => {
        if (a.room !== b.room) return a.room.localeCompare(b.room, "th", { numeric: true });
        return (a.student_number || 0) - (b.student_number || 0);
      });
    } else if (sortBy === "score-desc") {
      arr.sort((a, b) => b.score - a.score);
    } else if (sortBy === "score-asc") {
      arr.sort((a, b) => a.score - b.score);
    } else {
      arr.sort((a, b) => (b.submitted_at || "").localeCompare(a.submitted_at || ""));
    }
    return arr;
  }, [filtered, sortBy]);

  // สถิติแยกตามห้อง
  const roomStats = React.useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.room]) map[r.room] = { count: 0, sum: 0, max: 0, min: 999 };
      const s = map[r.room];
      s.count++; s.sum += r.score;
      s.max = Math.max(s.max, r.score);
      s.min = Math.min(s.min, r.score);
    });
    Object.values(map).forEach(s => { s.avg = s.count ? (s.sum / s.count) : 0; });
    return map;
  }, [filtered]);

  const overall = React.useMemo(() => {
    if (filtered.length === 0) return { count: 0, avg: 0, total: 0 };
    const sum = filtered.reduce((a, r) => a + r.score, 0);
    return { count: filtered.length, avg: sum / filtered.length, total: filtered[0].total || 0 };
  }, [filtered]);

  const fmtTime = (sec) => {
    if (!sec && sec !== 0) return "-";
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleExportCSV = () => {
    if (sorted.length === 0) { showToast("ไม่มีข้อมูลให้ดาวน์โหลด", "error"); return; }
    const headers = ["ปีการศึกษา", "วิชา", "ห้อง", "เลขที่", "ชื่อ-นามสกุล", "คะแนน", "เต็ม", "เปอร์เซ็นต์", "เวลาที่ใช้", "ออกจากหน้าสอบ(ครั้ง)", "วันที่สอบ", "เวลาส่ง"];
    const rows = sorted.map(r => [
      r.academic_year || "",
      `${r.subject_code || ""} ${r.subject_name || ""}`.trim(),
      r.room, r.student_number || "", r.student_name,
      r.score, r.total, ((r.score / r.total) * 100).toFixed(1) + "%",
      fmtTime(r.time_used_seconds), r.violations || 0,
      r.exam_date || "",
      r.submitted_at ? new Date(r.submitted_at).toLocaleString("th-TH") : "",
    ]);
    const BOM = "﻿";
    const csv = BOM + [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam_results_${filterRoom || "all"}_${filterDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ดาวน์โหลด CSV สำเร็จ", "success");
  };

  if (loading) return <LoadingSpinner text="กำลังโหลดผลสอบ..." />;

  return (
    <div className="page-enter" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
      <PageHeader
        title="ผลสอบ"
        subtitle="ผลการสอบแยกตามวิชาและห้อง"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={loadData}>🔄 รีเฟรช</button>
            <button className="btn btn-accent" onClick={handleExportCSV}>📥 ดาวน์โหลด CSV</button>
            <button className="btn btn-danger" onClick={handleDeleteFiltered}>🗑️ ลบตามตัวกรอง</button>
          </div>
        }
      />

      {/* Filters */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ minWidth: 120 }}>
            <label>ปีการศึกษา</label>
            <select className="select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label>สถานะการตรวจ{pendingCount > 0 ? ` (รอ ${pendingCount})` : ""}</label>
            <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">ทั้งหมด</option>
              <option value="pending">⏳ รอตรวจอัตนัย</option>
              <option value="graded">✓ ตรวจแล้ว</option>
            </select>
          </div>
          <div className="field" style={{ minWidth: 190 }}>
            <label>วิชา</label>
            <select className="select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">ทุกวิชา</option>
              {subjectCodes.map(c => {
                const s = examSubjects.find(x => x.code === c);
                return <option key={c} value={c}>{c}{s ? ` - ${s.name}` : ""}</option>;
              })}
            </select>
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label>ห้อง</label>
            <select className="select" value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
              <option value="">ทุกห้อง</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 160 }}>
            <label>วันที่สอบ</label>
            <select className="select" value={filterDate} onChange={e => setFilterDate(e.target.value)}>
              <option value="">ทุกวัน</option>
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label>เรียงลำดับ</label>
            <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="number">เลขที่ (ในแต่ละห้อง)</option>
              <option value="score-desc">คะแนน (มาก → น้อย)</option>
              <option value="score-asc">คะแนน (น้อย → มาก)</option>
              <option value="time-desc">เวลาส่ง (ล่าสุดก่อน)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Overall stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard icon="📝" label="ส่งข้อสอบแล้ว" value={overall.count} color="var(--primary)" />
        <StatCard icon="📊" label={`คะแนนเฉลี่ย (เต็ม ${overall.total})`} value={overall.avg.toFixed(1)} color="var(--accent)" />
      </div>

      {/* Per-room breakdown */}
      {Object.keys(roomStats).length > 0 && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>สรุปแยกตามห้อง</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
            {Object.entries(roomStats)
              .sort((a, b) => a[0].localeCompare(b[0], "th", { numeric: true }))
              .map(([room, s]) => (
                <Card key={room} className="reveal" style={{ borderLeft: "3px solid var(--primary)" }}>
                  <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>🏫 {room}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                    <div><span style={{ color: "var(--text-dim)" }}>ส่งแล้ว:</span> <strong>{s.count}</strong> คน</div>
                    <div><span style={{ color: "var(--text-dim)" }}>เฉลี่ย:</span> <strong style={{ color: "var(--accent)" }}>{s.avg.toFixed(1)}</strong></div>
                    <div><span style={{ color: "var(--text-dim)" }}>สูงสุด:</span> <strong style={{ color: "var(--success)" }}>{s.max}</strong></div>
                    <div><span style={{ color: "var(--text-dim)" }}>ต่ำสุด:</span> <strong style={{ color: "var(--danger)" }}>{s.min}</strong></div>
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}

      {/* Results table */}
      {sorted.length === 0 ? (
        <EmptyState icon="📝" title="ยังไม่มีผลสอบ" description="ยังไม่มีนักเรียนส่งข้อสอบตามเงื่อนไขที่เลือก" />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  <th style={exThStyle}>#</th>
                  <th style={exThStyle}>วิชา</th>
                  <th style={exThStyle}>ห้อง</th>
                  <th style={exThStyle}>เลขที่</th>
                  <th style={exThStyle}>ชื่อ-นามสกุล</th>
                  <th style={exThStyle}>คะแนน</th>
                  <th style={exThStyle}>%</th>
                  <th style={exThStyle}>เวลาที่ใช้</th>
                  <th style={exThStyle}>ออกจากหน้า</th>
                  <th style={exThStyle}>เวลาส่ง</th>
                  <th style={exThStyle}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const pct = (r.score / r.total) * 100;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={exTdStyle}>{i + 1}</td>
                      <td style={exTdStyle}>
                        <span className="mono" style={{ fontSize: 12 }}>{r.subject_code || "-"}</span>
                      </td>
                      <td style={exTdStyle}>{r.room}</td>
                      <td style={exTdStyle}>{r.student_number}</td>
                      <td style={exTdStyle}>{r.student_name}</td>
                      <td style={exTdStyle}>
                        <strong className="mono">{r.score}</strong>
                        <span style={{ color: "var(--text-mute)", fontSize: 12 }}>/{r.total}</span>
                        {r.needs_grading && !r.graded && (
                          <div><span className="chip" style={{ height: 20, fontSize: 10, color: "var(--accent)", background: "var(--accent-soft)", borderColor: "rgba(245,158,11,0.3)" }}>⏳ รอตรวจอัตนัย</span></div>
                        )}
                      </td>
                      <td style={exTdStyle}>
                        {r.needs_grading && !r.graded ? (
                          <span style={{ color: "var(--text-mute)", fontSize: 12 }}>—</span>
                        ) : (
                          <span style={{
                            fontWeight: 700,
                            color: pct >= 50 ? "var(--success)" : "var(--danger)",
                          }}>{pct.toFixed(0)}%</span>
                        )}
                      </td>
                      <td style={exTdStyle}><span className="mono" style={{ fontSize: 13 }}>{fmtTime(r.time_used_seconds)}</span></td>
                      <td style={exTdStyle}>
                        {r.violations > 0 ? (
                          <span className="chip" style={{
                            color: "var(--danger)", background: "var(--danger-soft)",
                            borderColor: "rgba(255,107,138,0.3)",
                          }}>⚠️ {r.violations}</span>
                        ) : <span style={{ color: "var(--text-mute)" }}>-</span>}
                      </td>
                      <td style={exTdStyle}>
                        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "-"}
                        </span>
                      </td>
                      <td style={exTdStyle}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {r.needs_grading && !r.graded ? (
                            <button className="btn btn-accent btn-sm" onClick={() => openDetail(r)}>📝 ตรวจ</button>
                          ) : (
                            <button className="btn btn-ghost btn-sm" onClick={() => openDetail(r)}>🔍</button>
                          )}
                          <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                            onClick={() => handleDelete(r)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail / Grading modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} wide
        title={detail ? `${detail.needs_grading && !detail.graded ? "📝 ตรวจข้อสอบ" : "คำตอบ"} · ${detail.student_name} (${detail.room} เลขที่ ${detail.student_number})` : ""}>
        {detail && (() => {
          const qs = questionsFor(detail.subject_code);
          const mcQs = qs.map((q, i) => ({ q, i })).filter(x => x.q.type !== "text");
          const subjQs = qs.map((q, i) => ({ q, i })).filter(x => x.q.type === "text");
          const subjEntered = subjQs.reduce((a, x) => a + (Number(gradeScores[x.i]) || 0), 0);
          const autoScore = detail.auto_score != null ? detail.auto_score : detail.score;
          const liveTotal = autoScore + subjEntered;
          const noSource = qs.length === 0;

          return (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <span className="chip">{detail.subject_code} - {detail.subject_name}</span>
                <span className="chip">ปรนัย {autoScore} คะแนน</span>
                <span className="chip">ใช้เวลา {fmtTime(detail.time_used_seconds)} นาที</span>
                {detail.violations > 0 && (
                  <span className="chip" style={{ color: "var(--danger)", background: "var(--danger-soft)" }}>
                    ⚠️ ออกจากหน้าสอบ {detail.violations} ครั้ง
                  </span>
                )}
              </div>

              {noSource && (
                <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, background: "var(--warn-soft)", color: "var(--text-dim)", fontSize: 13 }}>
                  ⚠️ ไม่พบข้อสอบต้นฉบับ (อาจถูกลบ) — แสดงคำตอบดิบเท่านั้น ให้คะแนนไม่ได้
                </div>
              )}

              {/* ปรนัย: กริดถูก/ผิด */}
              {mcQs.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>ปรนัย (ตรวจอัตโนมัติ)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))", gap: 6, marginBottom: 16 }}>
                    {mcQs.map(({ q, i }) => {
                      const given = detail.answers ? detail.answers[i] : undefined;
                      const ok = given === q.answer;
                      return (
                        <div key={i} title={q.q} style={{
                          padding: "6px 8px", borderRadius: 8, fontSize: 12,
                          background: ok ? "var(--success-soft)" : given ? "var(--danger-soft)" : "var(--surface)",
                          border: `1px solid ${ok ? "rgba(74,222,128,0.3)" : given ? "rgba(255,107,138,0.3)" : "var(--border)"}`,
                          color: ok ? "var(--success)" : given ? "var(--danger)" : "var(--text-mute)",
                          textAlign: "center",
                        }}>
                          <div style={{ fontWeight: 700 }}>ข้อ {i + 1}</div>
                          <div>{given || "-"} {ok ? "✓" : given ? `(${q.answer})` : ""}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* อัตนัย: แสดงคำตอบ + ช่องให้คะแนน */}
              {subjQs.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--accent)" }}>
                    ✍️ อัตนัย (ครูให้คะแนน)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                    {subjQs.map(({ q, i }) => {
                      const ans = detail.answers ? detail.answers[i] : "";
                      const maxP = q.points || 1;
                      return (
                        <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid rgba(245,158,11,0.3)" }}>
                          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>ข้อ {i + 1}. {q.q}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>คำตอบนักเรียน:</div>
                          <div style={{
                            padding: "8px 12px", borderRadius: 8, background: "var(--bg-soft)",
                            border: "1px solid var(--border)", fontSize: 14, whiteSpace: "pre-wrap",
                            minHeight: 20, marginBottom: 8,
                          }}>
                            {ans ? ans : <span style={{ color: "var(--text-mute)", fontStyle: "italic" }}>(ไม่ได้ตอบ)</span>}
                          </div>
                          {q.modelAnswer && (
                            <div style={{ fontSize: 12, color: "var(--success)", marginBottom: 8 }}>
                              💡 แนวคำตอบ: {q.modelAnswer}
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <label style={{ fontSize: 13, color: "var(--text-dim)" }}>ให้คะแนน:</label>
                            <input className="input" type="number" min="0" max={maxP}
                              style={{ width: 90, textAlign: "center" }}
                              value={gradeScores[i] != null ? gradeScores[i] : ""}
                              placeholder="0"
                              onChange={e => {
                                const v = e.target.value === "" ? "" : Math.max(0, Math.min(maxP, Number(e.target.value)));
                                setGradeScores(prev => ({ ...prev, [i]: v }));
                              }} />
                            <span style={{ fontSize: 13, color: "var(--text-mute)" }}>/ {maxP} คะแนน</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* สรุป + บันทึก */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                    padding: "12px 16px", borderRadius: 12, background: "var(--primary-soft)",
                  }}>
                    <div style={{ fontSize: 14 }}>
                      คะแนนรวม: <strong style={{ fontSize: 18, color: "var(--primary)" }}>{liveTotal}</strong>
                      <span style={{ color: "var(--text-dim)" }}> / {detail.total}</span>
                      <span style={{ fontSize: 12, color: "var(--text-mute)" }}> (ปรนัย {autoScore} + อัตนัย {subjEntered})</span>
                    </div>
                    <button className="btn btn-primary" onClick={saveGrading} disabled={grading || noSource}>
                      {grading ? "กำลังบันทึก..." : "💾 บันทึกผลการตรวจ"}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

const exThStyle = { padding: "12px 12px", textAlign: "left", fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, whiteSpace: "nowrap" };
const exTdStyle = { padding: "10px 12px", verticalAlign: "middle" };
