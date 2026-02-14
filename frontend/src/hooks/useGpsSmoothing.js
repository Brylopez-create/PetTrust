import { useState, useEffect, useRef } from 'react';

/**
 * Hook para suavizar el movimiento del GPS entre actualizaciones.
 * @param {Object} targetLocation {lat, lng} - La ubicación objetivo recibida del API.
 * @param {number} duration - Duración en ms para completar el movimiento (default 10000ms para polling).
 */
export const useGpsSmoothing = (targetLocation, duration = 10000) => {
    const [currentPos, setCurrentPos] = useState(targetLocation);
    const requestRef = useRef();
    const startTimeRef = useRef();
    const startPosRef = useRef(targetLocation);

    useEffect(() => {
        if (!targetLocation) return;

        // Resetear animación cuando llega una nueva ubicación
        startTimeRef.current = performance.now();
        startPosRef.current = currentPos || targetLocation;

        const animate = (time) => {
            if (!startTimeRef.current) startTimeRef.current = time;
            const progress = Math.min((time - startTimeRef.current) / duration, 1);

            // Interpolación lineal (Lerp) para fluidez absoluta
            const lat = startPosRef.current.lat + (targetLocation.lat - startPosRef.current.lat) * progress;
            const lng = startPosRef.current.lng + (targetLocation.lng - startPosRef.current.lng) * progress;

            setCurrentPos({ lat, lng });

            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [targetLocation, duration]);

    return currentPos;
};
