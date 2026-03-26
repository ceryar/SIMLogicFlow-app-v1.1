import { useState, useEffect } from 'react';
import { usePWA } from '../hooks/usePWA';
import './PWABanner.css';

export default function PWABanner() {
    const { isOnline, updateAvailable, applyUpdate, canInstall, installApp } = usePWA();
    const [showBackOnline, setShowBackOnline] = useState(false);
    const [lastOnlineStatus, setLastOnlineStatus] = useState(isOnline);

    useEffect(() => {
        if (!lastOnlineStatus && isOnline) {
            // Transitioned from offline to online
            setShowBackOnline(true);
            const timer = setTimeout(() => setShowBackOnline(false), 5000);
            return () => clearTimeout(timer);
        }
        setLastOnlineStatus(isOnline);
    }, [isOnline, lastOnlineStatus]);

    return (
        <div className="pwa-container">
            {/* ── OFFLINE BANNER ────────────────────────────────────── */}
            {!isOnline && (
                <div className="pwa-banner pwa-offline" role="alert">
                    <div className="pwa-banner-content">
                        <div className="pwa-icon-wrapper">
                            <span className="pwa-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                                    <path d="M10.71 5.05A16 16 0 0 1 22.56 9"></path>
                                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                                    <line x1="12" y1="20" x2="12.01" y2="20"></line>
                                </svg>
                            </span>
                        </div>
                        <div className="pwa-text">
                            <div className="pwa-title">Modo sin conexión</div>
                            <div className="pwa-desc">
                                Se muestran datos guardados en caché.
                                El acceso es de solo lectura.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BACK ONLINE TOAST ─────────────────────────────────── */}
            {showBackOnline && (
                <div className="pwa-banner pwa-online" role="status">
                    <div className="pwa-banner-content">
                        <div className="pwa-icon-wrapper online">
                            <span className="pwa-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                                    <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                                    <line x1="12" y1="20" x2="12.01" y2="20"></line>
                                </svg>
                            </span>
                        </div>
                        <div className="pwa-text">
                            <div className="pwa-title">Conexión restablecida</div>
                            <div className="pwa-desc">Vuelves a estar en línea.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── UPDATE AVAILABLE ─────────────────────────────────── */}
            {updateAvailable && isOnline && (
                <div className="pwa-banner pwa-update" role="status">
                    <div className="pwa-banner-content">
                        <div className="pwa-icon-wrapper update">
                            <span className="pwa-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                </svg>
                            </span>
                        </div>
                        <div className="pwa-text">
                            <div className="pwa-title">Actualización lista</div>
                            <div className="pwa-desc">SimLogicFlow tiene una nueva versión.</div>
                        </div>
                    </div>
                    <button className="pwa-action-btn" onClick={applyUpdate}>
                        Reiniciar
                    </button>
                </div>
            )}

            {/* ── INSTALL PROMPT ───────────────────────────────────── */}
            {canInstall && isOnline && (
                <div className="pwa-banner pwa-install" role="complementary">
                    <div className="pwa-banner-content">
                        <div className="pwa-icon-wrapper install">
                            <span className="pwa-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </span>
                        </div>
                        <div className="pwa-text">
                            <div className="pwa-title">Instalar App</div>
                            <div className="pwa-desc">Acceso rápido desde tu dispositivo.</div>
                        </div>
                    </div>
                    <button className="pwa-action-btn" onClick={installApp}>
                        Instalar
                    </button>
                </div>
            )}
        </div>
    );
}
