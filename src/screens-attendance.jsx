/* ===== Live Face Scanning Attendance ===== */
function ScreenAttendance({ showToast }) {
  const [subjects, setSubjects] = React.useState([]);
  const [students, setStudents] = React.useState([]);
  const [selectedSubject, setSelectedSubject] = React.useState("");
  const [selectedRoom, setSelectedRoom] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [cameraOn, setCameraOn] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [matcher, setMatcher] = React.useState(null);
  const [studentsMap, setStudentsMap] = React.useState({});
  const [checkedIn, setCheckedIn] = React.useState([]);
  const [lastMatch, setLastMatch] = React.useState(null);
  const [modelsReady, setModelsReady] = React.useState(FaceHelper.modelsLoaded);

  const camera = useCamera();
  const videoRef = React.useRef(null);
  const overlayRef = React.useRef(null);
  const scanInterval = React.useRef(null);
  const checkedIds = React.useRef(new Set());
  const matchBuffer = React.useRef({}); // label -> consecutive confirmation count
  const REQUIRED_CONFIRMATIONS = 3;     // ต้องเจอหน้าเดิมติดกันกี่เฟรมจึงบันทึก

  React.useEffect(() => {
    (async () => {
      try {
        const [subs, studs] = await Promise.all([DB.getSubjects(), DB.getStudents()]);
        setSubjects(subs);
        setStudents(studs);

        const map = {};
        studs.forEach(s => { map[s.id] = s; });
        setStudentsMap(map);

        await FaceHelper.loadModels();
        setModelsReady(true);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, []);

  // รายชื่อห้องทั้งหมด (เรียงตามเลขห้อง)
  const rooms = React.useMemo(() => {
    return [...new Set(students.map(s => s.room).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "th", { numeric: true }));
  }, [students]);

  // นักเรียนในห้องที่เลือก (ถ้าไม่เลือก = ทุกห้อง)
  const roomStudents = React.useMemo(() => {
    if (!selectedRoom) return students;
    return students.filter(s => s.room === selectedRoom);
  }, [students, selectedRoom]);

  // สร้าง matcher ใหม่ทุกครั้งที่เปลี่ยนห้อง — เทียบเฉพาะนักเรียนในห้องนั้น (แม่นขึ้น)
  React.useEffect(() => {
    if (!modelsReady) return;
    setMatcher(FaceHelper.createMatcher(roomStudents));
  }, [roomStudents, modelsReady]);

  const loadTodayAttendance = async (subjectId) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const records = await DB.getAttendance({ date: today, subject_id: subjectId });
      const ids = records.map(r => r.student_id);
      checkedIds.current = new Set(ids);
      setCheckedIn(records);
    } catch (e) { console.error(e); }
  };

  const startCamera = async () => {
    if (!selectedSubject) {
      showToast("กรุณาเลือกรายวิชาก่อน", "error");
      return;
    }
    if (!matcher) {
      showToast("ไม่มีนักเรียนที่ลงทะเบียนใบหน้า", "error");
      return;
    }
    try {
      const s = await camera.startCamera(camera.selectedDevice);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCameraOn(true);
      await loadTodayAttendance(selectedSubject);
      startScanning();
    } catch (e) {
      showToast("เปิดกล้องไม่สำเร็จ: " + e.message, "error");
    }
  };

  const stopCamera = () => {
    if (scanInterval.current) clearInterval(scanInterval.current);
    camera.stopCamera();
    setCameraOn(false);
    setScanning(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const switchCamera = async (deviceId) => {
    camera.setSelectedDevice(deviceId);
    if (cameraOn) {
      if (scanInterval.current) clearInterval(scanInterval.current);
      const s = await camera.startCamera(deviceId);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      startScanning();
    }
  };

  const startScanning = () => {
    if (scanInterval.current) clearInterval(scanInterval.current);
    setScanning(true);

    scanInterval.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || !matcher) return;

      try {
        const detections = await FaceHelper.detectAllFaces(videoRef.current);
        if (!detections || detections.length === 0) {
          if (overlayRef.current) {
            const ctx = overlayRef.current.getContext("2d");
            ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
          }
          return;
        }

        const matchResults = detections.map(d => matcher.findBestMatch(d.descriptor));

        if (overlayRef.current && videoRef.current) {
          overlayRef.current.width = videoRef.current.videoWidth;
          overlayRef.current.height = videoRef.current.videoHeight;
          FaceHelper.drawDetections(overlayRef.current, detections, matchResults, studentsMap);
        }

        // นับการยืนยันแบบติดกันหลายเฟรม เพื่อกันการจับคู่ผิด (false positive)
        const labelsThisFrame = new Set(
          matchResults.filter(m => m.label !== "unknown").map(m => m.label)
        );
        // รีเซ็ตตัวนับของหน้าที่ไม่ปรากฏในเฟรมนี้
        Object.keys(matchBuffer.current).forEach(label => {
          if (!labelsThisFrame.has(label)) matchBuffer.current[label] = 0;
        });

        for (let i = 0; i < matchResults.length; i++) {
          const match = matchResults[i];
          if (match.label === "unknown" || checkedIds.current.has(match.label)) continue;

          // เพิ่มตัวนับยืนยัน — ยังไม่ครบจำนวน ข้ามไปก่อน
          matchBuffer.current[match.label] = (matchBuffer.current[match.label] || 0) + 1;
          if (matchBuffer.current[match.label] < REQUIRED_CONFIRMATIONS) continue;

          {
            try {
              const record = await DB.markAttendance({
                student_id: match.label,
                subject_id: selectedSubject,
                check_date: new Date().toISOString().split("T")[0],
                check_time: new Date().toTimeString().split(" ")[0],
                status: "present",
                confidence: parseFloat((1 - match.distance).toFixed(4)),
              });
              checkedIds.current.add(match.label);
              setCheckedIn(prev => [record, ...prev]);
              setLastMatch(studentsMap[match.label]);
              const student = studentsMap[match.label];
              if (student) {
                showToast(`✓ ${student.prefix}${student.first_name} ${student.last_name} เช็คชื่อแล้ว`, "success");
              }
              setTimeout(() => setLastMatch(null), 3000);
            } catch (e) {
              console.error("Mark attendance error:", e);
              showToast("บันทึกเช็คชื่อไม่สำเร็จ: " + (e.message || e.details || JSON.stringify(e)), "error");
            }
          }
        }
      } catch (e) { console.error("Scan error:", e); }
    }, 500);
  };

  if (loading) return <LoadingSpinner text="กำลังโหลดโมเดล AI และข้อมูล..." />;

  const subjectObj = subjects.find(s => s.id === selectedSubject);
  const studentsWithFace = roomStudents.filter(s => s.face_descriptors?.length > 0);

  return (
    <div className="page-enter" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
      <PageHeader
        title="เช็คชื่อด้วยใบหน้า"
        subtitle="สแกนใบหน้านักเรียนแบบเรียลไทม์"
      />

      {/* Status bar */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20,
        padding: "12px 16px", borderRadius: 12,
        background: "var(--surface)", border: "1px solid var(--border)",
        fontSize: 13,
      }}>
        <span style={{ color: modelsReady ? "var(--success)" : "var(--warn)" }}>
          {modelsReady ? "✓ AI พร้อม" : "⏳ กำลังโหลด AI"}
        </span>
        <span style={{ color: "var(--border)" }}>|</span>
        <span>👥 นักเรียนมีใบหน้า{selectedRoom ? ` (${selectedRoom})` : ""}: {studentsWithFace.length}/{roomStudents.length} คน</span>
        <span style={{ color: "var(--border)" }}>|</span>
        <span>📅 วันที่: {new Date().toLocaleDateString("th-TH", { dateStyle: "full" })}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Camera section */}
        <div>
          {/* Subject + Room selector */}
          <Card style={{ marginBottom: 16 }}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>เลือกรายวิชาที่จะเช็คชื่อ</label>
              <select className="select" value={selectedSubject}
                onChange={e => { setSelectedSubject(e.target.value); if (cameraOn) loadTodayAttendance(e.target.value); }}
                disabled={cameraOn}>
                <option value="">-- เลือกรายวิชา --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.subject_code} - {s.subject_name} {s.teacher_name ? `(${s.teacher_name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>เลือกห้อง (เทียบเฉพาะนักเรียนในห้องนี้ — แม่นยำขึ้น)</label>
              <select className="select" value={selectedRoom}
                onChange={e => setSelectedRoom(e.target.value)}
                disabled={cameraOn}>
                <option value="">ทุกห้อง (เทียบนักเรียนทั้งหมด)</option>
                {rooms.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </Card>

          {/* Camera selector */}
          <Card style={{ marginBottom: 0 }}>
            <CameraSelector
              devices={camera.devices}
              selectedDevice={camera.selectedDevice}
              onSelect={switchCamera}
            />

            <div style={{
              position: "relative", width: "100%", aspectRatio: "4/3",
              background: "#000", borderRadius: 12, overflow: "hidden", marginBottom: 12,
            }}>
              <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                playsInline muted autoPlay />
              <canvas ref={overlayRef} style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                pointerEvents: "none",
              }} />
              {!cameraOn && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  color: "var(--text-dim)", textAlign: "center", padding: 20,
                }}>
                  <div style={{ fontSize: 64, marginBottom: 12 }}>📷</div>
                  <div>เลือกรายวิชาแล้วกดเริ่มเช็คชื่อ</div>
                </div>
              )}
              {scanning && (
                <div style={{
                  position: "absolute", top: 10, left: 10,
                  padding: "4px 12px", borderRadius: 8,
                  background: "rgba(255,0,0,0.8)", color: "#fff",
                  fontSize: 12, fontWeight: 600,
                  animation: "pulse 1.5s ease infinite",
                }}>
                  ● LIVE สแกนอยู่
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {!cameraOn ? (
                <button className="btn btn-primary" style={{ flex: 1, height: 52, fontSize: 16 }}
                  onClick={startCamera} disabled={!selectedSubject || !modelsReady}>
                  📷 เริ่มเช็คชื่อ
                </button>
              ) : (
                <button className="btn btn-danger" style={{ flex: 1, height: 52, fontSize: 16 }}
                  onClick={stopCamera}>
                  ⏹ หยุดเช็คชื่อ
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Right panel - checked in list */}
        <div>
          {/* Last match highlight */}
          {lastMatch && (
            <Card style={{
              marginBottom: 16, textAlign: "center",
              border: "2px solid var(--success)",
              animation: "pageIn 0.3s ease",
            }}>
              <div style={{ fontSize: 14, color: "var(--success)", fontWeight: 600, marginBottom: 8 }}>
                ✓ เช็คชื่อสำเร็จ!
              </div>
              {lastMatch.photo_url && (
                <img src={lastMatch.photo_url} style={{
                  width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
                  border: "3px solid var(--success)", margin: "0 auto 8px", display: "block",
                }} />
              )}
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {lastMatch.prefix}{lastMatch.first_name} {lastMatch.last_name}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                {lastMatch.room} เลขที่ {lastMatch.number}
              </div>
            </Card>
          )}

          {/* Checked in list */}
          <Card>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>
              มาเรียนแล้ว ({checkedIn.length}{selectedRoom ? `/${roomStudents.length}` : ""} คน)
            </h3>
            {subjectObj && (
              <div style={{
                fontSize: 12, color: "var(--accent)", marginBottom: 12,
                padding: "4px 10px", borderRadius: 6, background: "var(--accent-soft)",
                display: "inline-block",
              }}>
                {subjectObj.subject_code} - {subjectObj.subject_name}
              </div>
            )}

            {checkedIn.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-dim)", fontSize: 13 }}>
                {cameraOn ? "รอสแกนใบหน้า..." : "ยังไม่มีข้อมูล"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 500, overflowY: "auto" }}>
                {checkedIn.map((record, i) => {
                  const student = record.students || studentsMap[record.student_id];
                  if (!student) return null;
                  return (
                    <div key={record.id || i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 10,
                      background: "var(--surface)", border: "1px solid var(--border)",
                      fontSize: 13,
                    }}>
                      {student.photo_url ? (
                        <img src={student.photo_url} style={{
                          width: 36, height: 36, borderRadius: 8, objectFit: "cover",
                        }} />
                      ) : (
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: "var(--surface-strong)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>👤</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {student.prefix}{student.first_name} {student.last_name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                          {student.room} เลขที่ {student.number}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--success)", whiteSpace: "nowrap" }}>
                        {record.check_time ? record.check_time.substring(0, 5) : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
