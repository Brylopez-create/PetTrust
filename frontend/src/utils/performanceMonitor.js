// frontend/src/utils/performanceMonitor.js
import { onCLS, onFID, onLCP } from 'web-vitals';

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
    onFID(reportToBackend);
    onLCP(reportToBackend);
};
