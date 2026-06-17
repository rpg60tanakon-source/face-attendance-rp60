/* ===== Main App ===== */
function App() {
  const [page, setPage] = React.useState("home");
  const [toast, setToast] = React.useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const navigate = (p) => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  const renderPage = () => {
    switch (page) {
      case "home":
        return <ScreenHome onNavigate={navigate} />;
      case "register-student":
        return <ScreenRegisterStudent onNavigate={navigate} showToast={showToast} />;
      case "students":
        return <ScreenStudents onNavigate={navigate} showToast={showToast} />;
      case "register-subject":
        return <ScreenRegisterSubject showToast={showToast} />;
      case "attendance":
        return <ScreenAttendance showToast={showToast} />;
      case "reports":
        return <ScreenReports showToast={showToast} />;
      default:
        return <ScreenHome onNavigate={navigate} />;
    }
  };

  return (
    <React.Fragment>
      <TopBar currentPage={page} onNavigate={navigate} />
      {renderPage()}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
