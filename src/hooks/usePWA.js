import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Endpoints to warm up when user authenticates (GET only, safe to cache)
const WARM_UP_ENDPOINTS = [
    '/api/v1/courses',
    '/api/v1/simulators',
    '/api/v1/rooms',
    '/api/v1/roles',
    '/api/v1/maintenance-types',
    '/api/v1/users',
    '/api/v1/pro-courses',
    '/api/v1/maintenances',
    '/api/v1/maintenance-history',
];

/**
 * Trigger a background cache warm-up by making GET requests
 * to all key endpoints so they are stored in the SW cache.
 */
async function warmUpCache() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    await Promise.allSettled(
        WARM_UP_ENDPOINTS.map(url =>
            axios.get(url, { headers }).catch(() => { })
        )
    );
}

/**
 * usePWA — Hook to manage:
 * - Online / offline status
 * - Service Worker update notifications
 * - Install prompt (PWA installable)
 * - Cache warm-up after authentication
 */
export function usePWA() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [offlineAt, setOfflineAt] = useState(null);
    const [showUpdate, setShowUpdate] = useState(false);
    const [registration, setRegistration] = useState(null); // Kept for applyUpdate
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(
        window.matchMedia('(display-mode: standalone)').matches
    );
    const [cacheReady, setCacheReady] = useState(false);

    // ── Online / Offline events ─────────────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setOfflineAt(null);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setOfflineAt(new Date());
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ── Service Worker registration & update detection ──────────────────────
    useEffect(() => {
        const handleControllerChange = () => {
            if (document.visibilityState === 'visible') {
                window.location.reload();
            }
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) {
                    setRegistration(reg); // Set registration state
                    // Detect a waiting SW (update available)
                    if (reg.waiting) setShowUpdate(true);

                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setShowUpdate(true);
                                }
                            });
                        }
                    });
                }
            });
        }

        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            }
        };
    }, []);

    // ── Actions ────────────────────────────────────────────────────────────
    const applyUpdate = useCallback(() => {
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }, [registration]);

    // ── Install prompt (Add to Home Screen) ────────────────────────────────
    React.useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallPrompt(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = useCallback(async () => {
        if (!deferredPrompt) return;
        setIsInstalling(true);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
        setIsInstalling(false);
    }, [deferredPrompt]);

    // ── Cache warm-up: call this after login ───────────────────────────────
    const triggerCacheWarmUp = useCallback(async () => {
        // We do it from the UI thread so we can use axios with its interceptors (token)
        try {
            console.log('[PWA] Warming up cache for critical endpoints...');
            await warmUpCache();
            setCacheReady(true);

            // Also notify SW if it needs to know
            if (navigator.serviceWorker?.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'WARM_UP_CACHE',
                    status: 'completed'
                });
            }
        } catch (err) {
            console.error('Error triggering cache warm-up:', err);
        }
    }, []);

    return {
        isOnline,
        offlineAt,
        updateAvailable: showUpdate,
        applyUpdate,
        canInstall: showInstallPrompt && !isInstalled && !isInstalling,
        installApp,
        isInstalled,
        cacheReady,
        triggerCacheWarmUp,
    };
}
