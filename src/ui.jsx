/* ===== Shared UI Components ===== */

// ===== เมนูด้านซ้าย (จัดกลุ่ม) =====
const NAV_GROUPS = [
  {
    title: "งานประจำ", icon: "fa-solid fa-briefcase",
    items: [
      { key: "home", icon: "fa-solid fa-house", label: "หน้าหลัก" },
      { key: "attendance", icon: "fa-solid fa-camera", label: "เช็คชื่อด้วยใบหน้า" },
      { key: "exam", icon: "fa-solid fa-file-pen", label: "เข้าสอบ" },
    ],
  },
  {
    title: "นักเรียนและรายวิชา", icon: "fa-solid fa-users",
    items: [
      { key: "register-student", icon: "fa-solid fa-user-plus", label: "ลงทะเบียนนักเรียน" },
      { key: "students", icon: "fa-solid fa-address-book", label: "รายชื่อนักเรียน", admin: true },
      { key: "register-subject", icon: "fa-solid fa-book", label: "รายวิชา", admin: true },
    ],
  },
  {
    title: "รายงานและข้อสอบ", icon: "fa-solid fa-folder-open",
    items: [
      { key: "reports", icon: "fa-solid fa-chart-column", label: "รายงานการเข้าเรียน" },
      { key: "exam-results", icon: "fa-solid fa-trophy", label: "ผลสอบ", admin: true },
      { key: "exam-manage", icon: "fa-solid fa-file-arrow-up", label: "จัดการข้อสอบ", admin: true },
      { key: "omr", icon: "fa-solid fa-table-cells", label: "กระดาษคำตอบ", admin: true },
    ],
  },
];

function Sidebar({ currentPage, onNavigate, isAdmin, onLoginClick, onLogout, open, onClose }) {
  const go = (key) => { onNavigate(key); if (onClose) onClose(); };
  return (
    <>
      <div className={`sidebar-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head" onClick={() => go("home")}>
          <div className="sidebar-logo"><img src="assets/logo.png" alt="logo" /></div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-title">ระบบเช็คชื่อและสอบออนไลน์</div>
            <div className="sidebar-role">{isAdmin ? "ผู้ดูแลระบบ" : "รร.ราชประชานุเคราะห์ 60"}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map(group => (
            <div key={group.title}>
              <div className="nav-section"><i className={group.icon} />{group.title}</div>
              {group.items.map(item => (
                <button key={item.key}
                  className={`nav-item ${currentPage === item.key ? "active" : ""}`}
                  onClick={() => go(item.key)}>
                  <i className={item.icon} />
                  <span>{item.label}</span>
                  {item.admin && !isAdmin && <i className="fa-solid fa-lock nav-lock" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <i className={isAdmin ? "fa-solid fa-user-shield" : "fa-regular fa-user"}
              style={{ marginRight: 6, color: isAdmin ? "var(--primary)" : "var(--text-mute)" }} />
            {isAdmin ? "ผู้ดูแลระบบ" : "ผู้ใช้ทั่วไป"}
          </div>
          {isAdmin ? (
            <button className="sidebar-btn red" onClick={onLogout}>
              <i className="fa-solid fa-right-from-bracket" /> ออกจากระบบ
            </button>
          ) : (
            <button className="sidebar-btn orange" onClick={() => { onLoginClick(); if (onClose) onClose(); }}>
              <i className="fa-solid fa-user-shield" /> เข้าสู่ระบบผู้ดูแล
            </button>
          )}
          <div className="sidebar-dev">
            <small><i className="fa-solid fa-code" />ผู้พัฒนาระบบ</small>
            นายธนกร วุฒินันท์สุระสิทธิ์
          </div>
        </div>
      </aside>
    </>
  );
}

// แถบด้านบนบนมือถือ (มีปุ่มเปิดเมนู)
function MobileBar({ onMenu }) {
  return (
    <div className="mobile-bar">
      <button className="btn btn-ghost btn-sm" onClick={onMenu} aria-label="เปิดเมนู">
        <i className="fa-solid fa-bars" />
      </button>
      <div className="sidebar-logo" style={{ width: 32, height: 32 }}><img src="assets/logo.png" alt="logo" /></div>
      <div className="sidebar-title">ระบบเช็คชื่อและสอบออนไลน์</div>
    </div>
  );
}

// ไอคอนหัวเพจ (เลือกตามชื่อเพจ)
const PAGE_ICONS = {
  "ระบบเช็คชื่อด้วยใบหน้า": "fa-solid fa-house",
  "ลงทะเบียนนักเรียน": "fa-solid fa-user-plus",
  "รายชื่อนักเรียน": "fa-solid fa-address-book",
  "จัดการรายวิชา": "fa-solid fa-book",
  "เช็คชื่อด้วยใบหน้า": "fa-solid fa-camera",
  "รายงานการเข้าเรียน": "fa-solid fa-chart-column",
  "เข้าสอบ": "fa-solid fa-file-pen",
  "ข้อมูลผู้เข้าสอบ": "fa-solid fa-id-card",
  "ผลสอบ": "fa-solid fa-trophy",
  "จัดการข้อสอบ": "fa-solid fa-file-arrow-up",
  "กระดาษคำตอบ": "fa-solid fa-table-cells",
};

function PageHeader({ title, subtitle, actions, icon }) {
  return (
    <div className="page-head">
      <div className="page-head-icon"><i className={icon || PAGE_ICONS[title] || "fa-solid fa-layer-group"} /></div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

function Card({ children, style, className = "", onClick }) {
  return (
    <div className={`glass ${className}`} style={{ padding: 24, ...style }} onClick={onClick}>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <Card style={{ textAlign: "center", minWidth: 160 }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>{label}</div>
    </Card>
  );
}

function LoadingSpinner({ text = "กำลังโหลด..." }) {
  return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <div style={{
        width: 48, height: 48, border: "3px solid var(--border)",
        borderTopColor: "var(--primary)", borderRadius: "50%",
        animation: "spin 0.8s linear infinite", margin: "0 auto 16px"
      }} />
      <div style={{ color: "var(--text-dim)" }}>{text}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Toast({ message, type = "success" }) {
  if (!message) return null;
  const colors = { success: "var(--success)", error: "var(--danger)", info: "var(--info)" };
  return (
    <div className="toast">
      <span style={{ color: colors[type] || colors.info }}>●</span>
      <span>{message}</span>
    </div>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px", fontWeight: 600 }}>{title}</h3>
      <p style={{ color: "var(--text-dim)", margin: "0 0 20px" }}>{description}</p>
      {action}
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      padding: 20,
    }} onClick={onClose}>
      <div className="glass page-enter" style={{
        width: "100%", maxWidth: wide ? 800 : 500,
        maxHeight: "90vh", overflow: "auto",
        padding: 28,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, flex: 1, fontSize: 20 }}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginModal({ open, onClose, onSuccess, showToast }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (open) { setUsername(""); setPassword(""); }
  }, [open]);

  const submit = () => {
    if (username === window.ADMIN_USERNAME && password === window.ADMIN_PASSWORD) {
      onSuccess();
    } else {
      if (showToast) showToast("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="🔒 เข้าสู่ระบบผู้ดูแล">
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-dim)" }}>
        ต้องเข้าสู่ระบบผู้ดูแลเพื่อแก้ไข/ลบนักเรียน และจัดการรายวิชา
      </p>
      <div className="field" style={{ marginBottom: 14 }}>
        <label>ชื่อผู้ใช้</label>
        <input className="input" placeholder="username" value={username} autoFocus
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} />
      </div>
      <div className="field" style={{ marginBottom: 20 }}>
        <label>รหัสผ่าน</label>
        <input className="input" type="password" placeholder="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={submit}>🔓 เข้าสู่ระบบ</button>
      </div>
    </Modal>
  );
}

function AdminGate({ isAdmin, onLoginClick, children }) {
  if (isAdmin) return children;
  return (
    <div className="page-enter" style={{ maxWidth: 600, margin: "0 auto", padding: "60px 20px" }}>
      <Card style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>ต้องเข้าสู่ระบบผู้ดูแล</h2>
        <p style={{ color: "var(--text-dim)", margin: "0 0 20px", fontSize: 14 }}>
          หน้านี้สงวนสำหรับผู้ดูแลระบบเท่านั้น
        </p>
        <button className="btn btn-primary" onClick={onLoginClick}>
          🔓 เข้าสู่ระบบผู้ดูแล
        </button>
      </Card>
    </div>
  );
}

function CameraSelector({ selectedDevice, onSelect, devices }) {
  if (!devices || devices.length <= 1) return null;
  return (
    <div className="field" style={{ marginBottom: 12 }}>
      <label>เลือกกล้อง</label>
      <select className="select" value={selectedDevice} onChange={e => onSelect(e.target.value)}>
        {devices.map((d, i) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `กล้อง ${i + 1}`}
          </option>
        ))}
      </select>
    </div>
  );
}

function useCamera() {
  const [devices, setDevices] = React.useState([]);
  const [selectedDevice, setSelectedDevice] = React.useState("");
  const [stream, setStream] = React.useState(null);

  // อ่านรายชื่อกล้อง (ก่อนอนุญาตสิทธิ์ เบราว์เซอร์จะยังไม่บอก ID/ชื่อกล้อง)
  const refreshDevices = React.useCallback(async (activeStream) => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = all.filter(d => d.kind === "videoinput");
      setDevices(videoDevices);
      // ถ้ากล้องเปิดอยู่ ให้ช่องเลือกชี้ไปที่กล้องที่ใช้จริง
      const activeId = activeStream && activeStream.getVideoTracks()[0]
        && activeStream.getVideoTracks()[0].getSettings().deviceId;
      if (activeId) setSelectedDevice(activeId);
      else if (videoDevices.length > 0) setSelectedDevice(prev => prev || videoDevices[0].deviceId);
    } catch (e) { /* ignore */ }
  }, []);

  React.useEffect(() => { refreshDevices(null); }, []);

  // แปลง error ของกล้องเป็นข้อความภาษาไทยที่บอกวิธีแก้
  const cameraErrorMessage = (err) => {
    const n = err && err.name;
    if (n === "NotAllowedError" || n === "SecurityError")
      return "ไม่ได้รับอนุญาตให้ใช้กล้อง — กดไอคอนกล้อง/แม่กุญแจที่แถบที่อยู่เว็บ แล้วเลือก \"อนุญาต\" จากนั้นรีเฟรชหน้า";
    if (n === "NotFoundError" || n === "OverconstrainedError")
      return "เปิดกล้องไม่ได้ — กล้องอาจถูกโปรแกรมอื่นใช้อยู่ (เช่น แอป Camera ของ Windows, Teams, Zoom, LINE หรือแท็บอื่น) ให้ปิดโปรแกรมนั้นแล้วลองใหม่ · ถ้ายังไม่ได้ ตรวจว่าเสียบกล้องแล้ว และเปิดสิทธิ์กล้องใน Windows (การตั้งค่า > ความเป็นส่วนตัวและความปลอดภัย > กล้อง)";
    if (n === "NotReadableError" || n === "AbortError")
      return "กล้องถูกใช้งานโดยโปรแกรมอื่นอยู่ (เช่น Zoom, LINE หรือแท็บ/หน้าต่างอื่น) — ปิดโปรแกรมนั้นแล้วลองใหม่";
    return (err && err.message) || "ไม่ทราบสาเหตุ";
  };

  const startCamera = React.useCallback(async (deviceId) => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    const tryOpen = (video) => navigator.mediaDevices.getUserMedia({ video, audio: false });
    const isPermission = (e) => e && (e.name === "NotAllowedError" || e.name === "SecurityError");
    let s, lastErr;
    // 1) กล้องที่เลือกไว้ → 2) ให้เบราว์เซอร์เลือกเอง
    const attempts = deviceId ? [{ deviceId: { exact: deviceId } }, true] : [true];
    for (const v of attempts) {
      try { s = await tryOpen(v); break; }
      catch (e) { lastErr = e; if (isPermission(e)) break; }
    }
    // 3) ยังไม่ได้ → ไล่ลองกล้องทุกตัวที่เครื่องมี (กรณีค่าเริ่มต้นของ Chrome เป็นกล้องที่ใช้ไม่ได้)
    let camList = [];
    if (!s && !isPermission(lastErr)) {
      try {
        camList = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");
        for (const cam of camList) {
          if (!cam.deviceId || cam.deviceId === deviceId) continue;
          try { s = await tryOpen({ deviceId: { exact: cam.deviceId } }); break; }
          catch (e) { lastErr = e; }
        }
      } catch (e) { /* ignore */ }
    }
    if (!s) {
      // แนบข้อมูลวินิจฉัย เพื่อให้หาสาเหตุได้จากภาพหน้าจอ
      const names = camList.map((c, i) => c.label || `กล้อง ${i + 1}`).join(", ");
      const diag = ` [ตรวจพบกล้อง ${camList.length} ตัว${names ? ": " + names : ""} · รหัส: ${(lastErr && lastErr.name) || "-"}]`;
      throw new Error(cameraErrorMessage(lastErr) + diag);
    }
    setStream(s);
    refreshDevices(s); // หลังได้สิทธิ์แล้ว ดึงรายชื่อกล้องพร้อม ID/ชื่อจริง
    return s;
  }, [stream, refreshDevices]);

  const stopCamera = React.useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  return { devices, selectedDevice, setSelectedDevice, stream, startCamera, stopCamera };
}
