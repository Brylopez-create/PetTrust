// frontend/src/utils/performanceMonitor.js
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

const reportToBackend = (metric) => {
    const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        url: window.location.href,
        timestamp: new Date().toISOString()
    });

    // Usamos sendBeacon: se envía incluso si el usuario cierra la pestaña
    if (navigator.sendBeacon) {
        // Use full URL or ensure base is correct, but relative path is fine if hosted on same origin
        // However, API variable in App.js uses process.env.REACT_APP_BACKEND_URL
        // Here we use relative path assuming proxy or same origin. 
        // Better to use API url if possible, but keep simple for now as per existing code.
        // Existing code uses '/api/v1/performance-logs'.
        navigator.sendBeacon('/api/v1/performance-logs', body);
    } else {
        fetch('/api/v1/performance-logs', {
            body,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true
        });
    }
};

export const startPerformanceMonitoring = () => {
    onCLS(reportToBackend);
    onINP(reportToBackend);
    onLCP(reportToBackend);
    onFCP(reportToBackend);
    onTTFB(reportToBackend);
};
