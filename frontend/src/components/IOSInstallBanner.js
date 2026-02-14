import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';
import { Button } from './ui/button';

const IOSInstallBanner = () => {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Detectar si es iOS
        const isIos = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            return /iphone|ipad|ipod/.test(userAgent);
        };

        // Detectar si ya está en modo standalone (instalada)
        const isInStandaloneMode = () => {
            return ('standalone' in window.navigator) && (window.navigator.standalone);
        };

        // Solo mostrar si es iOS, no está instalada, y no ha sido cerrada previamente en esta sesión
        if (isIos() && !isInStandaloneMode() && !sessionStorage.getItem('iosBannerDismissed')) {
            // Esperar un poco para no ser intrusivos inmediatamente
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    if (!showBanner) return null;

    const handleDismiss = () => {
        setShowBanner(false);
        sessionStorage.setItem('iosBannerDismissed', 'true');
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-full duration-500">
            <div className="bg-white/95 backdrop-blur-md border border-stone-200 shadow-2xl rounded-2xl p-4 max-w-md mx-auto relative">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-stone-400 hover:text-stone-600 p-1"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4 pr-6">
                    <div className="bg-[#28B463] p-2 rounded-xl shrink-0">
                        <img src="/logo192.png" alt="PetTrust" className="w-10 h-10 object-contain" onError={(e) => e.target.style.display = 'none'} />
                        {/* Fallback icon if image fails */}
                        <svg className="w-10 h-10 text-white hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-heading font-bold text-stone-900 text-lg leading-tight mb-1">
                            ¡Instala PetTrust! 📲
                        </h3>
                        <p className="text-sm text-stone-600 leading-snug">
                            Recibe notificaciones de tus paseos y accede más rápido.
                        </p>
                    </div>
                </div>

                <div className="mt-4 space-y-3 bg-stone-50 rounded-xl p-3 border border-stone-100">
                    <div className="flex items-center gap-3 text-sm text-stone-700">
                        <span className="flex items-center justify-center w-6 h-6 bg-white rounded-full border border-stone-200 font-bold text-xs text-[#28B463]">1</span>
                        <span>Toca el botón <Share className="w-4 h-4 inline mx-1 text-blue-500" /> <strong>Compartir</strong></span>
                    </div>
                    <div className="w-px h-2 bg-stone-200 ml-3"></div>
                    <div className="flex items-center gap-3 text-sm text-stone-700">
                        <span className="flex items-center justify-center w-6 h-6 bg-white rounded-full border border-stone-200 font-bold text-xs text-[#28B463]">2</span>
                        <span>Selecciona <PlusSquare className="w-4 h-4 inline mx-1 text-stone-500" /> <strong>Agregar al inicio</strong></span>
                    </div>
                </div>

                <div className="mt-3 text-center">
                    <p className="text-xs text-stone-400 font-medium">Compatible con iOS 16.4+</p>
                </div>
            </div>
        </div>
    );
};

export default IOSInstallBanner;
