import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import AdminMenu from './components/AdminMenu'
import CoorAcadMenu from './components/CoorAcadMenu'
import TecnicoMenu from './components/TecnicoMenu'
import EstudianteMenu from './components/EstudianteMenu'
import InstructorMenu from './components/InstructorMenu'
import PseudopilotoMenu from './components/PseudopilotoMenu'
import PWABanner from './components/PWABanner'
import { usePWA } from './hooks/usePWA'
import ChangePasswordModal from './components/ChangePasswordModal'
import './App.css'

function App() {
  console.log("App initialization started...");
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(() => localStorage.getItem('role') || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('email') || '');
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') || '');
  const [mustChangePassword, setMustChangePassword] = useState(() => localStorage.getItem('mustChangePassword') === 'true');
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.warn("Error parsing user from localStorage:", e);
      return null;
    }
  });

  // ── Theme State ──
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const { triggerCacheWarmUp, isOnline } = usePWA();

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      setUserRole(localStorage.getItem('role') || '');
      setUserEmail(localStorage.getItem('email') || '');
      setUserId(localStorage.getItem('userId') || '');
      setMustChangePassword(localStorage.getItem('mustChangePassword') === 'true');
      // ── Pre-populate SW cache immediately after login ──
      triggerCacheWarmUp();
    } else {
      setIsAuthenticated(false);
      setUserRole('');
      setUserEmail('');
      setMustChangePassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('userId');
    localStorage.removeItem('mustChangePassword');
    setIsAuthenticated(false);
    setMustChangePassword(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={checkAuth} />;
  }

  const renderDashboard = () => {
    switch (userRole) {
      case 'ADMINISTRADOR':
        return <AdminMenu isOnline={isOnline} />;
      case 'COORDINADOR ACADÉMICO':
        return <CoorAcadMenu isOnline={isOnline} />;
      case 'COORDINADOR TÉCNICO':
      case 'TÉCNICO MANTENIMIENTO':
      case 'TECNICO':
        return <TecnicoMenu isOnline={isOnline} />;
      case 'ESTUDIANTE':
        return <EstudianteMenu userId={userId} isOnline={isOnline} />;
      case 'INSTRUCTOR':
        return <InstructorMenu userId={userId} isOnline={isOnline} />;
      case 'PSEUDOPILOTO':
        return <PseudopilotoMenu userId={userId} isOnline={isOnline} />;
      default:
        return (
          <main className="main-content">
            <h1>Dashboard</h1>
            <div className="card dashboard-card">
              <p>Welcome to SimLogicFlow! You are successfully authenticated.</p>
              <p>Your current role determines your access level to manage users, courses, and schedules.</p>
            </div>
          </main>
        );
    }
  };

  return (
    <div className="app-container">
      {/* PWA Banners: offline, update, install */}
      <PWABanner />

      {!isOnline && (
        <div className="offline-notification-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"></path>
          </svg>
          <span>Modo Lectura (Sin Conexión) — Las funciones de edición están deshabilitadas</span>
        </div>
      )}

      <nav className="navbar">
        <div className="nav-brand">SimLogicFlow</div>
        <div className="nav-user">
          <button onClick={toggleTheme} className="theme-toggle-btn" title="Cambiar tema">
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="18.36" x2="5.64" y2="16.94"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>
          <span className="user-email">{userEmail}</span>
          <span className="user-role badge">
            {userRole === 'COORACAD' || userRole === 'COORDINADOR ACADÉMICO' ? 'COORDINADOR ACADÉMICO' :
              userRole === 'TECNICO' || userRole === 'COORDINADOR TÉCNICO' ? 'COORDINADOR TÉCNICO' :
                userRole}
          </span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      {renderDashboard()}

      {mustChangePassword && (
        <ChangePasswordModal
          userId={userId}
          onPasswordChanged={() => {
            setMustChangePassword(false);
            checkAuth();
          }}
          isOnline={isOnline}
        />
      )}
    </div>
  )
}

export default App
