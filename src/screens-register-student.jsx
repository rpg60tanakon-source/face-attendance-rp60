/* ===== Student Registration with Face Capture ===== */
function ScreenRegisterStudent({ onNavigate, showToast }) {
  const [form, setForm] = React.useState({
    student_code: "", prefix: "เด็กชาย", first_name: "", last_name: "", room: "", number: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [cameraOn, setCameraOn] = React.useState(false);
  const [capturedPhotos, setCapturedPhotos] = React.useState([]);
  const [faceDescriptors, setFaceDescriptors] = React.useState([]);
  const [detecting, setDetecting] = React.useState(false);
  const [faceDetected, setFaceDetected] = React.useState(false);

  const camera = useCamera();
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const overlayRef = React.useRef(null);
  const detectInterval = React.useRef(null);

  const prefixOptions = ["เด็กชาย", "เด็กหญิง", "นาย", "นางสาว"];

  const handleInput = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const startCamera = async () => {
    try {
      await FaceHelper.loadModels();
      const s = await camera.startCamera(camera.selectedDevice);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCameraOn(true);
      startFaceDetection();
    } catch (e) {
      showToast("ไม่สามารถเปิดกล้องได้: " + e.message, "error");
    }
  };

  const stopCamera = () => {
    if (detectInterval.current) clearInterval(detectInterval.current);
    camera.stopCamera();
    setCameraOn(false);
    setFaceDetected(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const switchCamera = async (deviceId) => {
    camera.setSelectedDevice(deviceId);
    if (cameraOn) {
      if (detectInterval.current) clearInterval(detectInterval.current);
      const s = await camera.startCamera(deviceId);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      startFaceDetection();
    }
  };

  const startFaceDetection = () => {
    if (detectInterval.current) clearInterval(detectInterval.current);
    detectInterval.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused) return;
      const detection = await FaceHelper.detectFace(videoRef.current);
      setFaceDetected(!!detection);

      if (overlayRef.current && videoRef.current) {
        const canvas = overlayRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
          const box = detection.detection.box;
          ctx.strokeStyle = "#4ade80";
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.fillStyle = "rgba(74,222,128,0.8)";
          ctx.fillRect(box.x, box.y - 26, 120, 24);
          ctx.fillStyle = "#000";
          ctx.font = "bold 13px sans-serif";
          ctx.fillText("ตรวจพบใบหน้า ✓", box.x + 6, box.y - 8);
        }
      }
    }, 300);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !faceDetected) return;
    setDetecting(true);

    try {
      const detection = await FaceHelper.detectFace(videoRef.current);
      if (!detection) {
        showToast("ไม่พบใบหน้า กรุณาหันหน้าเข้ากล้อง", "error");
        setDetecting(false);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      const descriptor = Array.from(detection.descriptor);
      setCapturedPhotos(prev => [...prev, dataUrl]);
      setFaceDescriptors(prev => [...prev, descriptor]);
      showToast(`ถ่ายรูปที่ ${capturedPhotos.length + 1} สำเร็จ`, "success");
    } catch (e) {
      showToast("เกิดข้อผิดพลาด: " + e.message, "error");
    }
    setDetecting(false);
  };

  const removePhoto = (index) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    setFaceDescriptors(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.student_code || !form.first_name || !form.last_name || !form.room || !form.number) {
      showToast("กรุณากรอกข้อมูลให้ครบ", "error");
      return;
    }
    if (faceDescriptors.length === 0) {
      showToast("กรุณาถ่ายรูปใบหน้าอย่างน้อย 1 รูป", "error");
      return;
    }

    setSaving(true);
    try {
      let photoUrl = null;
      if (capturedPhotos.length > 0) {
        const blob = await (await fetch(capturedPhotos[0])).blob();
        const path = `students/${form.student_code}_${Date.now()}.jpg`;
        photoUrl = await DB.uploadPhoto(blob, path);
      }

      await DB.createStudent({
        student_code: form.student_code,
        prefix: form.prefix,
        first_name: form.first_name,
        last_name: form.last_name,
        room: form.room,
        number: parseInt(form.number),
        face_descriptors: faceDescriptors,
        photo_url: photoUrl,
      });

      showToast("ลงทะเบียนนักเรียนสำเร็จ!", "success");
      stopCamera();
      setForm({ student_code: "", prefix: "เด็กชาย", first_name: "", last_name: "", room: "", number: "" });
      setCapturedPhotos([]);
      setFaceDescriptors([]);
    } catch (e) {
      showToast("เกิดข้อผิดพลาด: " + (e.message || e.details), "error");
    }
    setSaving(false);
  };

  React.useEffect(() => {
    return () => {
      if (detectInterval.current) clearInterval(detectInterval.current);
      camera.stopCamera();
    };
  }, []);

  return (
    <div className="page-enter" style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
      <PageHeader
        title="ลงทะเบียนนักเรียน"
        subtitle="กรอกข้อมูลและถ่ายรูปใบหน้าสำหรับระบบเช็คชื่อ"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Form */}
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>ข้อมูลนักเรียน</h3>

          <div className="field" style={{ marginBottom: 14 }}>
            <label>รหัสนักเรียน</label>
            <input className="input" placeholder="เช่น 65001" value={form.student_code}
              onChange={e => handleInput("student_code", e.target.value)} />
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label>คำนำหน้า</label>
            <select className="select" value={form.prefix} onChange={e => handleInput("prefix", e.target.value)}>
              {prefixOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div className="field">
              <label>ชื่อ</label>
              <input className="input" placeholder="ชื่อจริง" value={form.first_name}
                onChange={e => handleInput("first_name", e.target.value)} />
            </div>
            <div className="field">
              <label>นามสกุล</label>
              <input className="input" placeholder="นามสกุล" value={form.last_name}
                onChange={e => handleInput("last_name", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div className="field">
              <label>ห้อง</label>
              <input className="input" placeholder="เช่น ม.1/1" value={form.room}
                onChange={e => handleInput("room", e.target.value)} />
            </div>
            <div className="field">
              <label>เลขที่</label>
              <input className="input" type="number" placeholder="เลขที่" value={form.number}
                onChange={e => handleInput("number", e.target.value)} />
            </div>
          </div>
        </Card>

        {/* Camera */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>ถ่ายรูปใบหน้า</h3>

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
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                color: "var(--text-dim)", fontSize: 14,
              }}>
                กดปุ่มเปิดกล้องด้านล่าง
              </div>
            )}
            {cameraOn && (
              <div style={{
                position: "absolute", top: 10, right: 10,
                padding: "4px 10px", borderRadius: 8,
                background: faceDetected ? "rgba(74,222,128,0.9)" : "rgba(255,107,138,0.9)",
                color: faceDetected ? "#000" : "#fff",
                fontSize: 12, fontWeight: 600,
              }}>
                {faceDetected ? "✓ พบใบหน้า" : "✗ ไม่พบใบหน้า"}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {!cameraOn ? (
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={startCamera}>
                📷 เปิดกล้อง
              </button>
            ) : (
              <>
                <button className="btn btn-primary" style={{ flex: 1 }}
                  onClick={capturePhoto} disabled={!faceDetected || detecting}>
                  {detecting ? "กำลังประมวลผล..." : "📸 ถ่ายรูป"}
                </button>
                <button className="btn btn-danger btn-sm" onClick={stopCamera}>
                  ปิดกล้อง
                </button>
              </>
            )}
          </div>

          {/* Captured photos */}
          {capturedPhotos.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>
                รูปที่ถ่ายแล้ว ({capturedPhotos.length} รูป) — แนะนำ 3-5 รูป
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {capturedPhotos.map((photo, i) => (
                  <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                    <img src={photo} style={{
                      width: "100%", height: "100%", objectFit: "cover",
                      borderRadius: 8, border: "2px solid var(--success)",
                    }} />
                    <button onClick={() => removePhoto(i)} style={{
                      position: "absolute", top: -6, right: -6,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "var(--danger)", color: "#fff",
                      fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                      border: "none", cursor: "pointer",
                    }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Submit */}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
        <button className="btn btn-primary" style={{ minWidth: 280, height: 52, fontSize: 16 }}
          onClick={handleSubmit} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "💾 บันทึกข้อมูลนักเรียน"}
        </button>
      </div>
    </div>
  );
}
