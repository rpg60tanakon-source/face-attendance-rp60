/* ===== กระดาษคำตอบ (OMR): พิมพ์กระดาษฝนคำตอบ ก–ง + เลขประจำตัว 5 หลัก =====
   ตำแหน่งทุกอย่างเป็นหน่วย มม. บน A4 (210×297) — หน้าสแกน (ก้อนถัดไป) ใช้ OMR_LAYOUT ชุดเดียวกัน
   ห้ามขยับตำแหน่งหลังจากพิมพ์กระดาษไปใช้แล้ว ไม่งั้นสแกนกระดาษเก่าไม่ได้ */

const OMR_LAYOUT = {
  page: { w: 210, h: 297 },
  // สี่เหลี่ยมดำ 4 มุม (จุดกึ่งกลาง) — กล้องใช้หาตำแหน่งกระดาษ
  marker: { size: 10, centers: [[15, 15], [195, 15], [15, 282], [195, 282]] },
  choices: ["A", "B", "C", "D"],
  choiceLabels: ["ก", "ข", "ค", "ง"],
  bubbleR: 2.4,
  // เลขประจำตัว 5 หลัก: หลักละ 1 คอลัมน์, แถวเลข 0–9
  id: { digits: 5, x0: 147, dx: 8, y0: 44, dy: 5.5 },
  // คำตอบ: 4 คอลัมน์ × 25 ข้อ = 100 ข้อ
  answers: { perCol: 25, cols: 4, x0: 22, colDx: 44, y0: 106, dy: 6.6, numW: 9, choiceDx: 6.5 },
  maxQuestions: 100,

  idBubble(digitIdx, value) {
    return [this.id.x0 + digitIdx * this.id.dx, this.id.y0 + value * this.id.dy];
  },
  answerBubble(qIdx, choiceIdx) {
    const a = this.answers;
    const col = Math.floor(qIdx / a.perCol), row = qIdx % a.perCol;
    return [a.x0 + col * a.colDx + a.numW + 3 + choiceIdx * a.choiceDx, a.y0 + row * a.dy];
  },
};

// รวมวิชาที่ฝังในโค้ด + วิชาจากฐานข้อมูล (แบบเดียวกับหน้าเข้าสอบ)
function useExamSubjects() {
  const [subjects, setSubjects] = React.useState(window.EXAM_SUBJECTS_BUILTIN || []);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    (async () => {
      const builtIn = window.EXAM_SUBJECTS_BUILTIN || [];
      try {
        const rows = await DB.getExamSubjects();
        setSubjects([...builtIn, ...rows.map(r => ({
          id: r.id, code: r.code, name: r.name, durationMinutes: r.duration_minutes,
          rooms: r.rooms || {}, questions: r.questions || [],
        }))]);
      } catch (e) {
        console.error("โหลดวิชาจากฐานข้อมูลไม่สำเร็จ:", e);
        setSubjects(builtIn);
      }
      setLoading(false);
    })();
  }, []);
  return { subjects, loading };
}

function OmrSheet({ subject }) {
  const L = OMR_LAYOUT;
  const questions = (subject ? subject.questions : []).slice(0, L.maxQuestions);
  const r = L.bubbleR;
  const ms = L.marker.size;
  const font = "'IBM Plex Sans Thai', sans-serif";

  const bubble = (cx, cy, label, key) => (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#333" strokeWidth="0.35" />
      {label !== undefined && (
        <text x={cx} y={cy + 0.9} fontSize="2.4" textAnchor="middle" fill="#aaa" fontFamily={font}>{label}</text>
      )}
    </g>
  );

  const usedCols = Math.max(1, Math.ceil(questions.length / L.answers.perCol));

  return (
    <svg className="omr-sheet" viewBox={`0 0 ${L.page.w} ${L.page.h}`}
      width={`${L.page.w}mm`} height={`${L.page.h}mm`} xmlns="http://www.w3.org/2000/svg"
      style={{ background: "#fff", fontFamily: font }}>
      {/* มุมดำ 4 มุม */}
      {L.marker.centers.map(([x, y], i) => (
        <rect key={i} x={x - ms / 2} y={y - ms / 2} width={ms} height={ms} fill="#000" />
      ))}

      {/* หัวกระดาษ */}
      <text x="26" y="16" fontSize="5.5" fontWeight="700" fill="#000">กระดาษคำตอบ</text>
      <text x="26" y="22.5" fontSize="3.2" fill="#000">โรงเรียนราชประชานุเคราะห์ 60</text>
      <text x="26" y="32" fontSize="3.6" fontWeight="600" fill="#000">
        วิชา {subject ? `${subject.code} ${subject.name}` : "......................................"}
      </text>
      <text x="26" y="42" fontSize="3.4" fill="#000">ชื่อ-สกุล ..................................................................</text>
      <text x="26" y="51" fontSize="3.4" fill="#000">ชั้น ................... เลขที่ ............. วันที่ ......................</text>

      {/* คำชี้แจง */}
      <rect x="24" y="58" width="110" height="38" rx="1.5" fill="none" stroke="#999" strokeWidth="0.3" />
      <text x="27" y="64" fontSize="3.2" fontWeight="600" fill="#000">คำชี้แจง</text>
      {[
        "1. เขียนเลขประจำตัว 5 หลักในช่องด้านขวา แล้วฝนวงกลมให้ตรงกัน",
        "2. ฝนวงกลมคำตอบให้เต็มวงและเข้ม ข้อละ 1 คำตอบเท่านั้น",
        "3. ใช้ดินสอ 2B หรือปากกาสีดำ/น้ำเงินเข้ม",
        "4. หากต้องการแก้ ให้ลบให้สะอาด ห้ามขีดฆ่า",
        "5. ห้ามพับ ขีดเขียน หรือทำให้มุมสี่เหลี่ยมดำเลอะ",
      ].map((t, i) => (
        <text key={i} x="27" y={70 + i * 5.2} fontSize="2.8" fill="#222">{t}</text>
      ))}
      <g transform="translate(110 64)">
        <text x="0" y="0" fontSize="2.6" fill="#222">ตัวอย่าง</text>
        <circle cx="4" cy="5" r={r} fill="#000" />
        <text x="8" y="6" fontSize="2.6" fill="#222">ถูก</text>
      </g>

      {/* เลขประจำตัว */}
      <text x={L.id.x0 + 2 * L.id.dx} y="26" fontSize="3" fontWeight="600" textAnchor="middle" fill="#000">เลขประจำตัวนักเรียน</text>
      {Array.from({ length: L.id.digits }).map((_, d) => {
        const x = L.id.x0 + d * L.id.dx;
        return (
          <g key={d}>
            <rect x={x - 3.2} y="29" width="6.4" height="8" fill="none" stroke="#000" strokeWidth="0.3" />
            {Array.from({ length: 10 }).map((_, v) => {
              const [cx, cy] = L.idBubble(d, v);
              return bubble(cx, cy, v, `id${d}-${v}`);
            })}
          </g>
        );
      })}

      {/* คำตอบ */}
      {Array.from({ length: usedCols }).map((_, c) => {
        const [hx] = L.answerBubble(c * L.answers.perCol, 0);
        return (
          <g key={`h${c}`}>
            {L.choiceLabels.map((lb, k) => (
              <text key={k} x={hx + k * L.answers.choiceDx} y={L.answers.y0 - 4.5}
                fontSize="2.8" fontWeight="600" textAnchor="middle" fill="#000">{lb}</text>
            ))}
          </g>
        );
      })}
      {questions.map((q, i) => {
        const [x0, y] = L.answerBubble(i, 0);
        const isText = q.type === "text";
        return (
          <g key={`q${i}`}>
            <text x={x0 - 4} y={y + 1.1} fontSize="3" fontWeight="600" textAnchor="end" fill="#000">{i + 1}</text>
            {isText
              ? <text x={x0 - 2} y={y + 1} fontSize="2.6" fill="#888">(อัตนัย — เขียนตอบในกระดาษแยก)</text>
              : L.choiceLabels.map((lb, k) => {
                  const [cx, cy] = L.answerBubble(i, k);
                  return bubble(cx, cy, lb, `a${i}-${k}`);
                })}
          </g>
        );
      })}

      <text x="105" y="292" fontSize="2.4" textAnchor="middle" fill="#888">
        {subject ? `${subject.code} · ${questions.length} ข้อ` : ""} · ระบบเช็คชื่อและสอบ รร.ราชประชานุเคราะห์ 60
      </text>
    </svg>
  );
}

const OMR_TH = { A: "ก", B: "ข", C: "ค", D: "ง" };

// ย่อภาพ/วิดีโอลง canvas (ด้านยาวไม่เกิน maxSide) เพื่อให้ประมวลผลเร็วบนมือถือ
function omrToCanvas(source, sw, sh, maxSide) {
  const k = Math.min(1, maxSide / Math.max(sw, sh));
  const c = document.createElement("canvas");
  c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  c.getContext("2d", { willReadFrequently: true }).drawImage(source, 0, 0, c.width, c.height);
  return c;
}

function OmrScanner({ subject, showToast }) {
  const [mode, setMode] = React.useState("idle"); // idle | live | result
  const [status, setStatus] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [overrides, setOverrides] = React.useState({});
  const [code, setCode] = React.useState("");
  const [student, setStudent] = React.useState(undefined); // undefined = ยังไม่ค้น, null = ไม่พบ
  const [saving, setSaving] = React.useState(false);
  const [savedKey, setSavedKey] = React.useState(null); // บันทึกแล้ว (ผูกกับเลขประจำตัว+คะแนน ณ ตอนบันทึก)
  const videoRef = React.useRef(null);
  const overlayRef = React.useRef(null);
  const resultRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const stableRef = React.useRef({ count: 0, last: null });
  const shotRef = React.useRef(null); // ภาพที่ถ่ายได้ (ใช้วาดผลซ้ำเมื่อครูแก้คำตอบ)
  const questions = subject.questions.slice(0, OMR_LAYOUT.maxQuestions);

  const stopCamera = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };
  React.useEffect(() => stopCamera, []);
  // เปลี่ยนวิชา = เริ่มใหม่
  React.useEffect(() => { stopCamera(); setMode("idle"); setResult(null); }, [subject]);

  const finalize = (canvas, img, corners) => {
    stopCamera();
    const r = OmrReader.read(img, corners, questions);
    shotRef.current = canvas;
    setResult(r);
    setOverrides({});
    setSavedKey(null);
    setCode(r.code);
    setMode("result");
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
      });
      streamRef.current = s;
      stableRef.current = { count: 0, last: null };
      setStatus("เล็งกล้องให้เห็นมุมดำครบ 4 มุม");
      setMode("live");
    } catch (e) {
      showToast("เปิดกล้องไม่ได้: " + (e.message || e.name), "error");
    }
  };

  // ต่อวิดีโอเข้ากล้องหลังหน้า live แสดงแล้ว
  React.useEffect(() => {
    if (mode !== "live" || !streamRef.current || !videoRef.current) return;
    const v = videoRef.current;
    v.srcObject = streamRef.current;
    v.play().catch(() => {});
    timerRef.current = setInterval(scanTick, 350);
    return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  }, [mode]);

  const scanTick = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = omrToCanvas(v, v.videoWidth, v.videoHeight, 1280);
    const img = OmrReader.grayFromCanvas(canvas);
    const corners = OmrReader.findMarkers(img);
    // วาดกรอบที่เจอบนวิดีโอ
    const ov = overlayRef.current;
    if (ov) {
      ov.width = canvas.width; ov.height = canvas.height;
      const ctx = ov.getContext("2d");
      ctx.clearRect(0, 0, ov.width, ov.height);
      if (corners) {
        const [tl, tr, bl, br] = corners;
        ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y); ctx.closePath(); ctx.stroke();
      }
    }
    const st = stableRef.current;
    if (!corners) { st.count = 0; st.last = null; setStatus("เล็งกล้องให้เห็นมุมดำครบ 4 มุม (ถือกระดาษแนวตั้ง)"); return; }
    const moved = st.last ? Math.max(...corners.map((p, i) => Math.hypot(p.x - st.last[i].x, p.y - st.last[i].y))) : Infinity;
    st.count = moved < canvas.width * 0.015 ? st.count + 1 : 1;
    st.last = corners;
    setStatus("เจอกระดาษแล้ว ถือนิ่งๆ...");
    if (st.count >= 3) finalize(canvas, img, corners);
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const im = new Image();
    im.onload = () => {
      const canvas = omrToCanvas(im, im.naturalWidth, im.naturalHeight, 1600);
      URL.revokeObjectURL(im.src);
      const img = OmrReader.grayFromCanvas(canvas);
      const corners = OmrReader.findMarkers(img);
      if (!corners) { showToast("หามุมดำไม่ครบ 4 มุม — ถ่ายใหม่ให้เห็นกระดาษทั้งแผ่น แนวตั้ง ในที่สว่าง", "error"); return; }
      finalize(canvas, img, corners);
    };
    im.onerror = () => showToast("เปิดไฟล์รูปไม่ได้", "error");
    im.src = URL.createObjectURL(file);
  };

  // คำตอบสุดท้าย = ที่ครูแก้ หรือที่อ่านได้
  const finalAnswers = result ? result.answers.map((a, i) =>
    a.type === "text" ? a : { ...a, choice: overrides[i] !== undefined ? overrides[i] : a.choice, edited: overrides[i] !== undefined }) : [];
  const choiceQs = questions.map((q, i) => ({ q, i })).filter(x => x.q.type !== "text");
  const correct = choiceQs.filter(({ q, i }) => finalAnswers[i] && finalAnswers[i].choice === q.answer).length;
  const needCheck = finalAnswers.filter(a => a.type === "choice" && a.status !== "ok" && !a.edited).length;
  const textPoints = questions.filter(q => q.type === "text").reduce((s, q) => s + (q.points || 1), 0);
  const saveKey = `${code}|${JSON.stringify(finalAnswers.map(a => a.choice || ""))}`;
  const isSaved = savedKey === saveKey;

  // บันทึกลงผลสอบ (รูปแบบเดียวกับสอบออนไลน์) — ถ้ามีผลเดิมของนักเรียนคนนี้ ถามก่อนบันทึกทับ
  const handleSave = async () => {
    if (!student) return;
    if (needCheck > 0 && !confirm(`ยังมี ${needCheck} ข้อสีเหลืองที่ยังไม่ได้ตรวจ (จะนับเป็นตอบผิด/ไม่ได้ตอบ) — บันทึกเลยหรือไม่?`)) return;
    const answers = {};
    finalAnswers.forEach((a, i) => { if (a.type === "choice" && a.choice) answers[i] = a.choice; });
    const hasText = textPoints > 0;
    const record = {
      subject_code: subject.code, subject_name: subject.name,
      room: student.room, student_name: `${student.prefix}${student.first_name} ${student.last_name}`,
      student_number: student.number,
      score: correct, total: choiceQs.length + textPoints, auto_score: correct,
      needs_grading: hasText, graded: !hasText,
      answers, violations: 0, academic_year: DB.currentYear(),
    };
    setSaving(true);
    try {
      const old = await DB.findExamResult(record);
      if (old) {
        if (!confirm(`${record.student_name} มีผลสอบวิชานี้อยู่แล้ว (${old.score}/${old.total}) — บันทึกทับด้วยคะแนนใหม่ ${correct}/${record.total} หรือไม่?`)) { setSaving(false); return; }
        await DB.updateExamResult(old.id, { ...record, manual_scores: null, submitted_at: new Date().toISOString() });
      } else {
        await DB.saveExamResult(record);
      }
      setSavedKey(saveKey);
      showToast(`บันทึกคะแนน ${record.student_name} ${correct}/${record.total} แล้ว`, "success");
    } catch (e) {
      showToast("บันทึกไม่สำเร็จ: " + (e.message || e.details || ""), "error");
    }
    setSaving(false);
  };

  // วาดผลบนภาพ: เขียว = ถูก, แดง = ผิด (วงเขียวเล็ก = เฉลย), เหลือง = ต้องตรวจสอบ
  React.useEffect(() => {
    if (mode !== "result" || !result || !resultRef.current || !shotRef.current) return;
    const base = shotRef.current, cv = resultRef.current;
    cv.width = base.width; cv.height = base.height;
    const ctx = cv.getContext("2d");
    ctx.drawImage(base, 0, 0);
    const L = OMR_LAYOUT, H = result.H;
    const ring = (mx, my, color, width, scale = 1) => {
      const [x, y] = OmrReader.project(H, mx, my);
      const [ex, ey] = OmrReader.project(H, mx + L.bubbleR, my);
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.arc(x, y, Math.max(4, Math.hypot(ex - x, ey - y) * 1.25 * scale), 0, Math.PI * 2); ctx.stroke();
    };
    result.digits.forEach((d, k) => {
      if (d.value !== null) ring(...L.idBubble(k, d.value), d.status === "ok" ? "#2563eb" : "#eab308", 3);
      else for (let v = 0; v < 10; v++) ring(...L.idBubble(k, v), "#eab308", 2);
    });
    finalAnswers.forEach((a, i) => {
      if (a.type !== "choice") return;
      const q = questions[i];
      const ki = a.choice ? L.choices.indexOf(a.choice) : -1;
      if (a.status !== "ok" && !a.edited) {
        L.choices.forEach((_, k) => ring(...L.answerBubble(i, k), "#eab308", 3));
      } else if (ki >= 0) {
        const ok = a.choice === q.answer;
        ring(...L.answerBubble(i, ki), ok ? "#16a34a" : "#dc2626", 3);
        if (!ok && q.answer) ring(...L.answerBubble(i, L.choices.indexOf(q.answer)), "#16a34a", 2, 0.75);
      }
    });
  }, [mode, result, overrides]);

  // ค้นชื่อนักเรียนจากเลขประจำตัว
  React.useEffect(() => {
    if (mode !== "result") return;
    if (!/^\d{5}$/.test(code)) { setStudent(undefined); return; }
    let cancel = false;
    DB.getStudentByCode(code)
      .then(s => { if (!cancel) setStudent(s || null); })
      .catch(() => { if (!cancel) setStudent(null); });
    return () => { cancel = true; };
  }, [code, mode]);

  const filePicker = (
    <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
      <i className="fa-solid fa-image" /> เลือกรูปภาพ
      <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
    </label>
  );

  if (mode === "idle") {
    return (
      <Card>
        <p style={{ marginTop: 0, fontSize: 14, color: "var(--text-dim)" }}>
          วางกระดาษบนพื้นเรียบ ในที่สว่าง ถือมือถือแนวตั้งเหนือกระดาษให้เห็นมุมดำครบ 4 มุม — ระบบจะถ่ายเองเมื่อถือนิ่ง
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={startCamera}><i className="fa-solid fa-camera" /> เปิดกล้องสแกน</button>
          {filePicker}
        </div>
      </Card>
    );
  }

  if (mode === "live") {
    return (
      <Card style={{ padding: 12 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 520, margin: "0 auto", background: "#000", borderRadius: 10, overflow: "hidden" }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", display: "block" }} />
          <canvas ref={overlayRef} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} />
        </div>
        <p style={{ textAlign: "center", fontWeight: 600, margin: "12px 0" }}>{status}</p>
        <div style={{ textAlign: "center" }}>
          <button className="btn btn-ghost" onClick={() => { stopCamera(); setMode("idle"); }}>ยกเลิก</button>
        </div>
      </Card>
    );
  }

  // mode === "result"
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0, width: 150 }}>
            <label>เลขประจำตัว</label>
            <input className="input mono" value={code} maxLength={5} inputMode="numeric"
              style={{ borderColor: result.idOk ? undefined : "#eab308" }}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div style={{ flex: 1, minWidth: 180, fontSize: 15 }}>
            {student === undefined && <span style={{ color: "#b45309" }}>อ่านเลขประจำตัวไม่ครบ — พิมพ์แก้ในช่องซ้าย</span>}
            {student === null && <span style={{ color: "var(--danger)" }}>ไม่พบนักเรียนรหัส {code}</span>}
            {student && <span><strong>{student.prefix}{student.first_name} {student.last_name}</strong> · {student.room} เลขที่ {student.number}</span>}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--primary)" }}>
            {correct}<span style={{ fontSize: 18, color: "var(--text-dim)" }}> / {choiceQs.length}</span>
          </div>
        </div>
        {needCheck > 0 && (
          <p style={{ margin: "12px 0 0", padding: "8px 12px", borderRadius: 8, background: "#fef9c3", color: "#854d0e", fontSize: 14 }}>
            มี {needCheck} ข้อที่ระบบไม่แน่ใจ (ช่องสีเหลือง) — ดูกระดาษแล้วเลือกคำตอบให้ถูกต้อง
            {needCheck > choiceQs.length / 3 && " · ถ้าวงสีในรูปด้านล่างไม่ตรงวงกลมบนกระดาษ ให้กด \"สแกนแผ่นถัดไป\" แล้วถ่ายใหม่ (วางกระดาษบนพื้นเรียบสีเรียบ)"}
          </p>
        )}
        {textPoints > 0 && (
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-dim)" }}>
            วิชานี้มีอัตนัย {textPoints} คะแนน — หลังบันทึกแล้วให้กรอกคะแนนอัตนัยในหน้า "ผลสอบ"
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button className="btn btn-accent" onClick={handleSave} disabled={!student || saving || isSaved}
            title={!student ? "ต้องมีเลขประจำตัวที่ตรงกับนักเรียนในระบบก่อน" : ""}>
            <i className={`fa-solid ${isSaved ? "fa-check" : "fa-floppy-disk"}`} />
            {saving ? " กำลังบันทึก..." : isSaved ? " บันทึกแล้ว" : " บันทึกคะแนน"}
          </button>
          <button className="btn btn-primary" onClick={() => {
            if (!isSaved && student && !confirm("ยังไม่ได้บันทึกคะแนนแผ่นนี้ — สแกนแผ่นถัดไปเลยหรือไม่?")) return;
            startCamera();
          }}><i className="fa-solid fa-camera" /> สแกนแผ่นถัดไป</button>
          {filePicker}
          <button className="btn btn-ghost" title="บันทึกภาพต้นฉบับที่สแกน (ไว้ส่งให้ผู้พัฒนาตรวจเมื่ออ่านผิด)"
            onClick={() => shotRef.current && shotRef.current.toBlob(b => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(b); a.download = `omr-${code || "scan"}.jpg`; a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            }, "image/jpeg", 0.92)}>
            <i className="fa-solid fa-download" /> บันทึกรูป
          </button>
        </div>
      </Card>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 6 }}>
          {finalAnswers.map((a, i) => {
            if (a.type !== "choice") return (
              <div key={i} style={{ fontSize: 12, color: "var(--text-dim)", padding: 6 }}>{i + 1}. อัตนัย</div>
            );
            const q = questions[i];
            const warn = a.status !== "ok" && !a.edited;
            const ok = a.choice && a.choice === q.answer;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: 8, fontSize: 13,
                background: warn ? "#fef9c3" : ok ? "#dcfce7" : "#fee2e2",
                border: `1px solid ${warn ? "#eab308" : ok ? "#86efac" : "#fca5a5"}`,
              }}>
                <span style={{ width: 22, textAlign: "right", fontWeight: 600 }}>{i + 1}</span>
                <select value={a.choice || ""} style={{ flex: 1, fontSize: 13, padding: 2, borderRadius: 6 }}
                  onChange={e => setOverrides(o => ({ ...o, [i]: e.target.value || null }))}>
                  <option value="">–</option>
                  {OMR_LAYOUT.choices.map(c => <option key={c} value={c}>{OMR_TH[c]}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </Card>

      <Card style={{ padding: 12 }}>
        <canvas ref={resultRef} style={{ width: "100%", maxWidth: 620, display: "block", margin: "0 auto", borderRadius: 8 }} />
        <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", marginBottom: 0 }}>
          วงเขียว = ถูก · วงแดง = ผิด (วงเขียวเล็ก = เฉลย) · วงเหลือง = ต้องตรวจสอบ · วงน้ำเงิน = เลขประจำตัว
        </p>
      </Card>
    </div>
  );
}

// ===== ข้อสอบฉบับพิมพ์ (ไม่มีเฉลย) — ตัวเลือก ก–ง ตรงกับกระดาษคำตอบ =====
function ExamBooklet({ subject }) {
  const qs = subject.questions.slice(0, OMR_LAYOUT.maxQuestions);
  const nChoice = qs.filter(q => q.type !== "text").length, nText = qs.length - nChoice;
  const font = "'IBM Plex Sans Thai', sans-serif";
  // ตัวเลือกสั้น → วางหลายคอลัมน์ ประหยัดกระดาษ
  const optCols = (q) => {
    const len = Math.max(...OMR_LAYOUT.choices.map(c => String(q.options[c] || "").length));
    return len <= 14 ? 4 : len <= 32 ? 2 : 1;
  };
  return (
    <div className="booklet" style={{ fontFamily: font, color: "#000", fontSize: "12pt", lineHeight: 1.5 }}>
      <div style={{ textAlign: "center", marginBottom: "4mm" }}>
        <div style={{ fontSize: "11pt" }}>โรงเรียนราชประชานุเคราะห์ 60</div>
        <div style={{ fontSize: "15pt", fontWeight: 700 }}>แบบทดสอบ วิชา {subject.code} {subject.name}</div>
        <div style={{ fontSize: "11pt" }}>
          จำนวน {qs.length} ข้อ{nText > 0 ? ` (ปรนัย ${nChoice} ข้อ · อัตนัย ${nText} ข้อ)` : ""}
          {subject.durationMinutes ? ` · เวลา ${subject.durationMinutes} นาที` : ""}
        </div>
      </div>
      <div style={{ fontSize: "11pt", marginBottom: "3mm" }}>
        ชื่อ-สกุล ........................................................ ชั้น .............. เลขที่ ........ เลขประจำตัว ..................
      </div>
      <div style={{ border: "0.3mm solid #000", borderRadius: "1.5mm", padding: "2mm 4mm", fontSize: "10.5pt", marginBottom: "5mm" }}>
        <strong>คำชี้แจง</strong> ให้นักเรียนเลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว แล้ว<strong>ฝนคำตอบลงในกระดาษคำตอบ</strong>
        {" "}ห้ามขีดเขียนใดๆ ลงในข้อสอบ{nText > 0 ? " · ข้ออัตนัยให้เขียนตอบในกระดาษแยก" : ""}
      </div>
      {qs.map((q, i) => (
        <div key={i} style={{ breakInside: "avoid", pageBreakInside: "avoid", marginBottom: "3.5mm" }}>
          <div style={{ display: "flex", gap: "2mm" }}>
            <span style={{ fontWeight: 600, minWidth: "8mm" }}>{i + 1}.</span>
            <span style={{ whiteSpace: "pre-wrap" }}>
              {q.q}
              {q.type === "text" && <em style={{ fontSize: "10pt" }}> (อัตนัย {q.points || 1} คะแนน — เขียนตอบในกระดาษแยก)</em>}
            </span>
          </div>
          {q.type !== "text" && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${optCols(q)}, 1fr)`, columnGap: "4mm", paddingLeft: "10mm" }}>
              {OMR_LAYOUT.choices.filter(c => q.options[c] !== undefined).map(c => (
                <div key={c}>{OMR_TH[c]}. {q.options[c]}</div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div style={{ textAlign: "center", marginTop: "6mm", fontSize: "11pt" }}>— หมดข้อสอบ —</div>
    </div>
  );
}

// ขอบกระดาษต่างกัน: กระดาษคำตอบต้องไม่มีขอบ (ตำแหน่งวงกลมเป็น มม.) ส่วนข้อสอบมีขอบ + เลขหน้า
const PAGE_CSS = {
  sheet: "@page { size: A4; margin: 0; }",
  booklet: '@page { size: A4; margin: 15mm 15mm 18mm; @bottom-center { content: "หน้า " counter(page) " / " counter(pages); font-size: 9pt; } }',
};

function ScreenOmr({ showToast }) {
  const { subjects, loading } = useExamSubjects();
  const [tab, setTab] = React.useState("print");
  const [doc, setDoc] = React.useState("booklet"); // booklet = ข้อสอบ, sheet = กระดาษคำตอบ
  const [subjectIdx, setSubjectIdx] = React.useState("");
  const subject = subjectIdx === "" ? null : subjects[parseInt(subjectIdx)];
  const qCount = subject ? subject.questions.length : 0;
  const choiceCount = subject ? subject.questions.filter(q => q.type !== "text").length : 0;

  const doPrint = () => {
    let st = document.getElementById("print-page-style");
    if (!st) { st = document.createElement("style"); st.id = "print-page-style"; document.head.appendChild(st); }
    st.textContent = PAGE_CSS[doc];
    window.print();
  };

  const printDoc = subject && tab === "print" && (doc === "sheet"
    ? <div className="omr-page"><OmrSheet subject={subject} /></div>
    : <ExamBooklet subject={subject} />);

  return (
    <div>
      <PageHeader title="กระดาษคำตอบ" subtitle="พิมพ์ข้อสอบและกระดาษคำตอบแบบฝน ก–ง แล้วตรวจด้วยกล้องมือถือ"
        actions={subject && tab === "print" && (
          <button className="btn btn-primary" onClick={doPrint}>
            <i className="fa-solid fa-print" /> พิมพ์{doc === "sheet" ? "กระดาษคำตอบ" : "ข้อสอบ"}
          </button>
        )} />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`btn ${tab === "print" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("print")}>
          <i className="fa-solid fa-print" /> พิมพ์
        </button>
        <button className={`btn ${tab === "scan" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("scan")}>
          <i className="fa-solid fa-camera" /> สแกนตรวจ
        </button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>เลือกวิชาสอบ</label>
          <select className="select" value={subjectIdx} onChange={e => setSubjectIdx(e.target.value)} disabled={loading}>
            <option value="">{loading ? "กำลังโหลด..." : "— เลือกวิชา —"}</option>
            {subjects.map((s, i) => (
              <option key={s.id || s.code} value={i}>{s.code} {s.name} ({s.questions.length} ข้อ)</option>
            ))}
          </select>
        </div>
        {tab === "print" && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className={`btn btn-sm ${doc === "booklet" ? "btn-accent" : "btn-ghost"}`} onClick={() => setDoc("booklet")}>
              <i className="fa-solid fa-file-lines" /> ข้อสอบ (ให้นักเรียน)
            </button>
            <button className={`btn btn-sm ${doc === "sheet" ? "btn-accent" : "btn-ghost"}`} onClick={() => setDoc("sheet")}>
              <i className="fa-solid fa-table-cells" /> กระดาษคำตอบ
            </button>
          </div>
        )}
        {subject && tab === "print" && (
          <p style={{ marginTop: 12, marginBottom: 0, fontSize: 13, color: "var(--text-dim)" }}>
            ปรนัย {choiceCount} ข้อ{qCount - choiceCount > 0 ? ` · อัตนัย ${qCount - choiceCount} ข้อ (ครูตรวจเอง)` : ""}
            {" · "}กด <strong>พิมพ์</strong> แล้วตั้งค่า: กระดาษ A4, ขนาด 100% (ไม่ย่อ/ไม่ขยาย), ปิด "หัวกระดาษและท้ายกระดาษ"
            {doc === "booklet" && " · ข้อสอบไม่มีเฉลย ใช้ซ้ำได้ทุกห้อง"}
          </p>
        )}
        {qCount > OMR_LAYOUT.maxQuestions && (
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 13, color: "var(--danger)" }}>
            วิชานี้มี {qCount} ข้อ — กระดาษ 1 แผ่นรองรับสูงสุด {OMR_LAYOUT.maxQuestions} ข้อ จะพิมพ์เฉพาะข้อ 1–{OMR_LAYOUT.maxQuestions}
          </p>
        )}
      </Card>

      {printDoc && <div className={doc === "sheet" ? "omr-preview" : "booklet-preview"}>{printDoc}</div>}
      {/* สำเนาสำหรับพิมพ์ — วางเป็นลูกของ body เพื่อให้แบ่งหน้าได้ปกติ */}
      {printDoc && ReactDOM.createPortal(<div className="print-root">{printDoc}</div>, document.body)}
      {subject && tab === "scan" && <OmrScanner subject={subject} showToast={showToast} />}
    </div>
  );
}
