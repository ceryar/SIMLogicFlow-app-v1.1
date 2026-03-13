import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// ── Error Handling ────────────────────────────────────────────────────────
// Este manejador captura errores que ocurren durante la ejecución
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const root = document.getElementById('root');
    // Si el error es de React (null dispatcher), a veces es mejor dejarlo pasar a la consola
    if (root && !root.innerHTML.includes('Error de Sistema')) {
      root.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444; font-family: sans-serif; background: #fff; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <h1 style="font-size: 24px; margin-bottom: 10px;">⚠️ Error de Sistema</h1>
          <p style="color: #64748b; max-width: 600px; margin-bottom: 20px;">${message}</p>
          <pre style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 13px; overflow: auto; max-width: 800px; text-align: left; border: 1px solid #e2e8f0; color: #334155;">${error?.stack || ''}</pre>
          <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button onclick="localStorage.clear(); location.reload();" style="padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Borrar Datos y Reiniciar</button>
            <button onclick="location.reload();" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Reintentar</button>
          </div>
        </div>
      `;
    }
    if (originalOnError) return originalOnError(message, source, lineno, colno, error);
    return false;
  };
}

// ── Axios Global Configuration ────────────────────────────────────────────────
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '/';

// Add token to all requests automatically
axios.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn("Could not access localStorage:", e);
  }
  return config;
});

// ── Service Worker Registration ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] Registrado en scope:', reg.scope);

        // Detectar actualizaciones del SW
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] Nueva versión disponible');
              window.dispatchEvent(new CustomEvent('sw-update-available'));
            }
          });
        });
      })
      .catch(err => {
        console.warn('[SW] Error en registro:', err);
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// Get root element safely
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <App />
  );
} else {
  console.error("No se encontró el elemento #root en el DOM.");
}
