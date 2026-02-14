import React from 'react';

const MapSkeleton = () => {
    return (
        <div className="w-full h-[400px] bg-stone-100 relative overflow-hidden animate-pulse">
            {/* Simulación de cuadrícula de mapa */}
            <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}></div>

            {/* Card de status flotante (Skeleton) */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-stone-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-stone-200 rounded w-1/3"></div>
                        <div className="h-3 bg-stone-200 rounded w-1/2"></div>
                    </div>
                    <div className="w-16 h-6 bg-stone-200 rounded-full"></div>
                </div>
            </div>

            {/* Marcador central (Skeleton) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 bg-emerald-200 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-emerald-400 rounded-full"></div>
                </div>
                <div className="w-4 h-1 bg-stone-300 rounded-full mt-1 mx-auto blur-[1px]"></div>
            </div>
        </div>
    );
};

export default MapSkeleton;
