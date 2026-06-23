/* ===== Shared UI Components ===== */

function TopBar({ currentPage, onNavigate, isAdmin, onLoginClick, onLogout }) {
  const navItems = [
    { key: "home", icon: "🏠", label: "หน้าหลัก" },
    { key: "register-student", icon: "👤", label: "ลงทะเบียนนักเรียน" },
    { key: "students", icon: "👥", label: "รายชื่อนักเรียน" },
    { key: "register-subject", icon: "📚", label: "รายวิชา" },
    { key: "attendance", icon: "📷", label: "เช็คชื่อ" },
    { key: "reports", icon: "📊", label: "รายงาน" },
  ];

  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="topbar">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => onNavigate("home")}>
          <div className="brand-mark">
            <img src="assets/logo.png" alt="logo" />
          </div>
          <div>
            <div className="brand-title">ระบบเช็คชื่อด้วยใบหน้า</div>
            <div className="brand-sub">รร.ราชประชานุเคราะห์ 60</div>
          </div>
        </div>

        <div className="grow" />

        {/* Desktop nav */}
        <div className="hide-sm" style={{ display: "flex", gap: 4 }}>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`btn btn-sm ${currentPage === item.key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => onNavigate(item.key)}
              style={{ fontSize: 13 }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Admin login/logout */}
        <button
          className={`btn btn-sm ${isAdmin ? "btn-accent" : "btn-ghost"}`}
          onClick={isAdmin ? onLogout : onLoginClick}
          style={{ fontSize: 13 }}
          title={isAdmin ? "ออกจากระบบผู้ดูแล" : "เข้าสู่ระบบผู้ดูแล"}
        >
          <span>{isAdmin ? "🔓" : "🔒"}</span>
          <span className="hide-sm">{isAdmin ? "ผู้ดูแล" : "ผู้ดูแล"}</span>
        </button>

        {/* Mobile menu button */}
        <button
          className="btn btn-ghost btn-sm show-sm-only"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: "none" }}
          id="menu-toggle"
        >
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ padding: "8px 20px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`btn btn-sm ${currentPage === item.key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { onNavigate(item.key); setMenuOpen(false); }}
              style={{ justifyContent: "flex-start" }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{title}</h1>
        {subtitle && <p style={{ margin: "4px 0 0", color: "var(--text-dim)", fontSize: 14 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
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

  React.useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(all => {
      const videoDevices = all.filter(d => d.kind === "videoinput");
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    });
  }, []);

  const startCamera = React.useCallback(async (deviceId) => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    const constraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: false,
    };
    const s = await navigator.mediaDevices.getUserMedia(constraints);
    setStream(s);
    return s;
  }, [stream]);

  const stopCamera = React.useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  return { devices, selectedDevice, setSelectedDevice, stream, startCamera, stopCamera };
}
