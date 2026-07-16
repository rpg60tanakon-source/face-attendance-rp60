/* ===== Mode 5: Midterm Exam (สอบระหว่างภาค) ===== */
function ScreenExam({ showToast }) {
  // stage: subject -> room -> info -> exam -> result
  const [stage, setStage] = React.useState("subject");
  const [subject, setSubject] = React.useState(null);  // วิชาที่เลือก
  const [room, setRoom] = React.useState("");       // ห้องที่เลือก (ยืนยันรหัสแล้ว)
  const [pickRoom, setPickRoom] = React.useState(""); // ห้องที่กำลังจะกรอกรหัส
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [answers, setAnswers] = React.useState({});
  const [timeLeft, setTimeLeft] = React.useState(0);
  const [result, setResult] = React.useState(null);
  const [violations, setViolations] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const subjects = window.EXAM_SUBJECTS || [];
  const questions = subject ? subject.questions : [];
  const rooms = Object.keys(window.EXAM_ROOM_PASSWORDS || {});
  const durationSec = (subject ? subject.durationMinutes || 60 : 60) * 60;

  const timerRef = React.useRef(null);
  const startTimeRef = React.useRef(null);
  const submittedRef = React.useRef(false);
  const violationsRef = React.useRef(0);
  const answersRef = React.useRef({});

  React.useEffect(() => { answersRef.current = answers; }, [answers]);

  // ---------- ป้องกันการทุจริต (เรียกตอนเข้าโหมดสอบ) ----------
  const beforeUnloadHandler = (e) => {
    e.preventDefault();
    e.returnValue = "กำลังทำข้อสอบอยู่ ต้องการออกจากหน้านี้จริงหรือไม่? การออกจะถือว่าส่งข้อสอบ";
    return e.returnValue;
  };
  const contextMenuHandler = (e) => { e.preventDefault(); return false; };
  const visibilityHandler = () => {
    if (document.hidden && !submittedRef.current) {
      violationsRef.current += 1;
      setViolations(violationsRef.current);
      showToast(`⚠️ ตรวจพบการออกจากหน้าสอบ (ครั้งที่ ${violationsRef.current}) — ระบบบันทึกไว้แล้ว`, "error");
    }
  };
  const enableAntiCheat = () => {
    window.addEventListener("beforeunload", beforeUnloadHandler);
    document.addEventListener("contextmenu", contextMenuHandler);
    document.addEventListener("visibilitychange", visibilityHandler);
    // พยายามเข้าโหมดเต็มจอ (best-effort)
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } catch (e) {}
  };
  const disableAntiCheat = () => {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    document.removeEventListener("contextmenu", contextMenuHandler);
    document.removeEventListener("visibilitychange", visibilityHandler);
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) {}
  };

  // cleanup เมื่อออกจากหน้า
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      disableAntiCheat();
    };
  }, []);

  // ---------- ตัวจับเวลา ----------
  const startTimer = () => {
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remain = durationSec - elapsed;
      if (remain <= 0) {
        setTimeLeft(0);
        clearInterval(timerRef.current);
        handleSubmit(true); // หมดเวลา = ส่งอัตโนมัติ
      } else {
        setTimeLeft(remain);
      }
    }, 1000);
  };

  // ---------- Flow: เลือกห้อง + รหัสผ่าน ----------
  const verifyPassword = () => {
    const correct = window.EXAM_ROOM_PASSWORDS[pickRoom];
    if (password === correct) {
      setRoom(pickRoom);
      setStage("info");
      showToast(`เข้าห้อง ${pickRoom} สำเร็จ`, "success");
    } else {
      showToast("รหัสผ่านห้องไม่ถูกต้อง", "error");
    }
  };

  // ---------- Flow: เริ่มสอบ ----------
  const startExam = () => {
    if (!name.trim()) { showToast("กรุณากรอกชื่อ-นามสกุล", "error"); return; }
    if (!number.trim()) { showToast("กรุณากรอกเลขที่", "error"); return; }
    setStage("exam");
    submittedRef.current = false;
    violationsRef.current = 0;
    setViolations(0);
    setTimeLeft(durationSec);
    enableAntiCheat();
    startTimer();
  };

  // ---------- ส่งข้อสอบ ----------
  const handleSubmit = async (auto = false) => {
    if (submittedRef.current) return;
    if (!auto) {
      const unanswered = questions.length - Object.keys(answersRef.current).length;
      const msg = unanswered > 0
        ? `ยังไม่ได้ตอบ ${unanswered} ข้อ ต้องการส่งข้อสอบเลยหรือไม่?`
        : "ต้องการส่งข้อสอบหรือไม่?";
      if (!confirm(msg)) return;
    }
    submittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    disableAntiCheat();

    const ans = answersRef.current;
    let score = 0;
    questions.forEach((q, i) => { if (ans[i] === q.answer) score++; });
    const timeUsed = startTimeRef.current
      ? Math.min(durationSec, Math.floor((Date.now() - startTimeRef.current) / 1000))
      : 0;

    const resultData = {
      subject_code: subject.code, subject_name: subject.name,
      room, student_name: name.trim(), student_number: parseInt(number) || null,
      score, total: questions.length,
      answers: ans, violations: violationsRef.current,
      time_used_seconds: timeUsed,
    };

    setSaving(true);
    let savedOk = false;
    try {
      await DB.saveExamResult(resultData);
      savedOk = true;
    } catch (e) {
      console.error("Save exam error:", e);
      showToast("บันทึกผลไม่สำเร็จ: " + (e.message || e.details || ""), "error");
    }
    setSaving(false);

    setResult({ ...resultData, auto, savedOk });
    setStage("result");
    window.scrollTo(0, 0);
  };

  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ===================== RENDER =====================

  // ----- Stage: เลือกวิชา -----
  if (stage === "subject") {
    return (
      <div className="page-enter" style={{ maxWidth: 620, margin: "0 auto", padding: "40px 20px" }}>
        <PageHeader title="สอบระหว่างภาค" subtitle="เลือกวิชาที่จะสอบ" />
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>เลือกรายวิชา</h3>
          {subjects.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: 14 }}>ยังไม่มีชุดข้อสอบในระบบ</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {subjects.map(s => (
                <button key={s.id} className="btn btn-ghost"
                  style={{ height: "auto", padding: "16px 18px", justifyContent: "flex-start", textAlign: "left" }}
                  onClick={() => { setSubject(s); setStage("room"); }}>
                  <span style={{ fontSize: 28, marginRight: 12 }}>📚</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      {s.code} · {s.questions.length} ข้อ · {s.durationMinutes || 60} นาที
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ----- Stage: เลือกห้อง + รหัสผ่าน -----
  if (stage === "room") {
    return (
      <div className="page-enter" style={{ maxWidth: 620, margin: "0 auto", padding: "40px 20px" }}>
        <PageHeader title="สอบระหว่างภาค" subtitle={subject ? `${subject.code} - ${subject.name}` : ""} />
        <Card>
          {!pickRoom ? (
            <>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>เลือกห้องสอบ</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                {rooms.map(r => (
                  <button key={r} className="btn btn-ghost" style={{ height: 72, fontSize: 18, fontWeight: 600 }}
                    onClick={() => { setPickRoom(r); setPassword(""); }}>
                    🏫 {r}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSubject(null); setStage("subject"); }}>
                ← เปลี่ยนวิชา
              </button>
            </>
          ) : (
            <>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>
                ห้อง {pickRoom} — กรอกรหัสผ่าน
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-dim)" }}>
                รหัสผ่านจากครูผู้คุมสอบ
              </p>
              <div className="field" style={{ marginBottom: 20 }}>
                <label>รหัสผ่านห้อง {pickRoom}</label>
                <input className="input" type="password" placeholder="••••••" value={password} autoFocus
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && verifyPassword()} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                <button className="btn btn-ghost" onClick={() => { setPickRoom(""); setPassword(""); }}>
                  ← เปลี่ยนห้อง
                </button>
                <button className="btn btn-primary" onClick={verifyPassword}>ยืนยันรหัสผ่าน</button>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  // ----- Stage: กรอกชื่อ-เลขที่ -----
  if (stage === "info") {
    return (
      <div className="page-enter" style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
        <PageHeader title="ข้อมูลผู้เข้าสอบ" subtitle={`${subject.code} - ${subject.name} · ห้อง ${room}`} />
        <Card>
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 20,
            background: "var(--warn-soft)", border: "1px solid rgba(250,204,21,0.3)",
            fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7,
          }}>
            <strong style={{ color: "var(--warn)" }}>⚠️ กติกาการสอบ</strong><br />
            • มีเวลา <strong>{subject.durationMinutes || 60} นาที</strong> ({questions.length} ข้อ)<br />
            • ห้ามคลิกขวา ห้ามสลับ/ย่อ/ปิดแท็บ — ระบบจะบันทึกการออกจากหน้าสอบ<br />
            • เมื่อหมดเวลา ระบบจะส่งข้อสอบอัตโนมัติ
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>ชื่อ - นามสกุล</label>
            <input className="input" placeholder="เช่น เด็กชายสมชาย ใจดี" value={name} autoFocus
              onChange={e => setName(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 24 }}>
            <label>เลขที่</label>
            <input className="input" type="number" placeholder="เลขที่" value={number}
              onChange={e => setNumber(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", height: 52, fontSize: 16 }}
            onClick={startExam}>
            ▶ เริ่มสอบ
          </button>
        </Card>
      </div>
    );
  }

  // ----- Stage: ทำข้อสอบ (เต็มจอ) -----
  if (stage === "exam") {
    const answeredCount = Object.keys(answers).length;
    const lowTime = timeLeft <= 60;
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "var(--bg)", overflowY: "auto",
      }} onContextMenu={e => e.preventDefault()}>
        {/* Sticky exam bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "linear-gradient(180deg, rgba(11,13,26,0.97), rgba(11,13,26,0.9))",
          borderBottom: "1px solid var(--border)", backdropFilter: "blur(10px)",
          padding: "12px 20px",
        }}>
          <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              📝 {subject.code} · {room}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{name} เลขที่ {number}</div>
            <div className="grow" />
            {violations > 0 && (
              <span className="chip" style={{ color: "var(--danger)", background: "var(--danger-soft)", borderColor: "rgba(255,107,138,0.3)" }}>
                ⚠️ ออกจากหน้า {violations} ครั้ง
              </span>
            )}
            <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
              ตอบแล้ว {answeredCount}/{questions.length}
            </span>
            <div className="mono" style={{
              fontSize: 20, fontWeight: 700, padding: "4px 14px", borderRadius: 10,
              background: lowTime ? "var(--danger-soft)" : "var(--primary-soft)",
              color: lowTime ? "var(--danger)" : "var(--primary)",
              animation: lowTime ? "pulse 1s ease infinite" : "none",
            }}>
              ⏱ {fmtTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Questions */}
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px 120px" }}>
          {questions.map((q, i) => (
            <Card key={i} style={{ marginBottom: 16, borderLeft: answers[i] ? "3px solid var(--success)" : "3px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{
                  flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                  background: "var(--primary-soft)", color: "var(--primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14,
                }}>{i + 1}</div>
                <div style={{ fontWeight: 500, fontSize: 15, lineHeight: 1.5, paddingTop: 4 }}>{q.q}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 40 }}>
                {["A", "B", "C", "D"].map(opt => {
                  const selected = answers[i] === opt;
                  return (
                    <button key={opt}
                      onClick={() => setAnswers(a => ({ ...a, [i]: opt }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                        padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                        background: selected ? "var(--primary-soft)" : "var(--surface)",
                        border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                        color: "var(--text)", fontSize: 14, transition: "all .15s",
                      }}>
                      <span style={{
                        flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
                        border: `2px solid ${selected ? "var(--primary)" : "var(--border-strong)"}`,
                        background: selected ? "var(--primary)" : "transparent",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700,
                      }}>{opt}</span>
                      <span>{q.options[opt]}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}

          <button className="btn btn-primary" style={{ width: "100%", height: 56, fontSize: 17, marginTop: 8 }}
            onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? "กำลังส่ง..." : "✅ ส่งข้อสอบ"}
          </button>
        </div>
      </div>
    );
  }

  // ----- Stage: ผลสอบ -----
  if (stage === "result" && result) {
    const pct = Math.round((result.score / result.total) * 100);
    const passed = pct >= 50;
    return (
      <div className="page-enter" style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{passed ? "🎉" : "📄"}</div>
          <h2 style={{ margin: "0 0 4px" }}>ส่งข้อสอบเรียบร้อย</h2>
          <p style={{ color: "var(--text-dim)", margin: "0 0 4px", fontSize: 13 }}>
            {result.subject_code} - {result.subject_name}
          </p>
          <p style={{ color: "var(--text-dim)", margin: "0 0 20px", fontSize: 14 }}>
            {result.student_name} · ห้อง {result.room} เลขที่ {result.student_number}
            {result.auto && <span style={{ color: "var(--warn)" }}> (หมดเวลา)</span>}
          </p>

          <div style={{
            fontSize: 52, fontWeight: 800,
            color: passed ? "var(--success)" : "var(--danger)",
          }}>
            {result.score}<span style={{ fontSize: 24, color: "var(--text-dim)" }}> / {result.total}</span>
          </div>
          <div style={{ fontSize: 18, color: "var(--text-dim)", marginBottom: 20 }}>{pct}%</div>

          {result.violations > 0 && (
            <div style={{
              padding: "8px 14px", borderRadius: 10, marginBottom: 16,
              background: "var(--danger-soft)", color: "var(--danger)", fontSize: 13,
            }}>
              ⚠️ ตรวจพบการออกจากหน้าสอบ {result.violations} ครั้ง (บันทึกให้ครูแล้ว)
            </div>
          )}

          <div style={{ fontSize: 13, color: "var(--text-mute)" }}>
            ใช้เวลา {fmtTime(result.time_used_seconds)} นาที · {result.savedOk
              ? "ผลถูกบันทึกเรียบร้อย"
              : "⚠️ บันทึกผลไม่สำเร็จ (แจ้งครูผู้คุมสอบ)"}
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
