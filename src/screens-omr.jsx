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
          id: r.id, code: r.code, name: r.name, rooms: r.rooms || {}, questions: r.questions || [],
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
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#555" strokeWidth="0.25" />
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

function ScreenOmr({ showToast }) {
  const { subjects, loading } = useExamSubjects();
  const [subjectIdx, setSubjectIdx] = React.useState("");
  const subject = subjectIdx === "" ? null : subjects[parseInt(subjectIdx)];
  const qCount = subject ? subject.questions.length : 0;
  const choiceCount = subject ? subject.questions.filter(q => q.type !== "text").length : 0;

  return (
    <div>
      <PageHeader title="กระดาษคำตอบ" subtitle="พิมพ์กระดาษคำตอบแบบฝน ก–ง สำหรับตรวจด้วยกล้องมือถือ"
        actions={subject && (
          <button className="btn btn-primary" onClick={() => window.print()}>
            <i className="fa-solid fa-print" /> พิมพ์
          </button>
        )} />

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
        {subject && (
          <p style={{ marginTop: 12, marginBottom: 0, fontSize: 13, color: "var(--text-dim)" }}>
            ปรนัย {choiceCount} ข้อ{qCount - choiceCount > 0 ? ` · อัตนัย ${qCount - choiceCount} ข้อ (ครูตรวจเอง)` : ""}
            {" · "}กด <strong>พิมพ์</strong> แล้วตั้งค่า: กระดาษ A4, ขนาด 100% (ไม่ย่อ/ไม่ขยาย), ปิด "หัวกระดาษและท้ายกระดาษ"
          </p>
        )}
        {qCount > OMR_LAYOUT.maxQuestions && (
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 13, color: "var(--danger)" }}>
            วิชานี้มี {qCount} ข้อ — กระดาษ 1 แผ่นรองรับสูงสุด {OMR_LAYOUT.maxQuestions} ข้อ จะพิมพ์เฉพาะข้อ 1–{OMR_LAYOUT.maxQuestions}
          </p>
        )}
      </Card>

      {subject && (
        <div className="omr-preview">
          <OmrSheet subject={subject} />
        </div>
      )}
    </div>
  );
}
