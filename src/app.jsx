/* ===== Main App ===== */
function App() {
  const [page, setPage] = React.useState("home");
  const [toast, setToast] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(() => sessionStorage.getItem("isAdmin") === "1");
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false); // เมนูบนมือถือ
  const pendingAction = React.useRef(null);

  // โหลดปีการศึกษาปัจจุบันเข้า cache ตั้งแต่เปิดแอป
  React.useEffect(() => { DB.loadCurrentYear(); }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), type === "error" ? 10000 : 3500); // error ค้างนานขึ้นให้อ่าน/ถ่ายภาพทัน
  };

  const navigate = (p) => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  // เรียกเมื่อต้องการสิทธิ์ผู้ดูแล — ถ้ายังไม่ล็อกอินจะเปิดหน้าต่างล็อกอินก่อน
  const requireAdmin = (action) => {
    if (isAdmin) { action(); }
    else { pendingAction.current = action; setLoginOpen(true); }
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    sessionStorage.setItem("isAdmin", "1");
    setLoginOpen(false);
    showToast("เข้าสู่ระบบผู้ดูแลสำเร็จ", "success");
    if (pendingAction.current) { pendingAction.current(); pendingAction.current = null; }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem("isAdmin");
    showToast("ออกจากระบบผู้ดูแลแล้ว", "info");
  };

  const renderPage = () => {
    switch (page) {
      case "home":
        return <ScreenHome onNavigate={navigate} />;
      case "register-student":
        return <ScreenRegisterStudent onNavigate={navigate} showToast={showToast} />;
      case "students":
        return (
          <AdminGate isAdmin={isAdmin} onLoginClick={() => setLoginOpen(true)}>
            <ScreenStudents onNavigate={navigate} showToast={showToast} isAdmin={isAdmin} requireAdmin={requireAdmin} />
          </AdminGate>
        );
      case "register-subject":
        return (
          <AdminGate isAdmin={isAdmin} onLoginClick={() => setLoginOpen(true)}>
            <ScreenRegisterSubject showToast={showToast} />
          </AdminGate>
        );
      case "attendance":
        return <ScreenAttendance showToast={showToast} />;
      case "reports":
        return <ScreenReports showToast={showToast} />;
      case "exam":
        return <ScreenExam showToast={showToast} />;
      case "exam-results":
        return (
          <AdminGate isAdmin={isAdmin} onLoginClick={() => setLoginOpen(true)}>
            <ScreenExamResults showToast={showToast} />
          </AdminGate>
        );
      case "exam-manage":
        return (
          <AdminGate isAdmin={isAdmin} onLoginClick={() => setLoginOpen(true)}>
            <ScreenExamManage showToast={showToast} />
          </AdminGate>
        );
      case "omr":
        return (
          <AdminGate isAdmin={isAdmin} onLoginClick={() => setLoginOpen(true)}>
            <ScreenOmr showToast={showToast} />
          </AdminGate>
        );
      default:
        return <ScreenHome onNavigate={navigate} />;
    }
  };

  return (
    <React.Fragment>
      <div className="app-shell">
        <Sidebar
          currentPage={page}
          onNavigate={navigate}
          isAdmin={isAdmin}
          onLoginClick={() => setLoginOpen(true)}
          onLogout={handleLogout}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="main">
          <MobileBar onMenu={() => setSidebarOpen(true)} />
          {renderPage()}
        </main>
      </div>
      <LoginModal
        open={loginOpen}
        onClose={() => { setLoginOpen(false); pendingAction.current = null; }}
        onSuccess={handleLoginSuccess}
        showToast={showToast}
      />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
