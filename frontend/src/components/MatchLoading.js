import React, { useState, useEffect } from 'react';
import { Radar } from 'lucide-react';

const MatchLoading = () => {
    const [step, setStep] = useState(0);
    const steps = [
        "Escaneando geocerca de 3km...",
        "Calculando precisión Haversine...",
        "Analizando compatibilidad de raza...",
        "Verificando reputación senior...",
        "Validando slots de tiempo..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((s) => (s + 1) % steps.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <style>
                {`
          @keyframes radar-pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 0.3; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
          .radar-container {
            position: relative;
            width: 120px;
            height: 120px;
          }
          .radar-outer {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border: 2px solid #28B463;
            border-radius: 50%;
            animation: radar-pulse 2s infinite ease-in-out;
          }
          .radar-inner {
            position: absolute;
            top: 20px; left: 20px; right: 20px; bottom: 20px;
            background: rgba(40, 180, 99, 0.1);
            border: 1px solid rgba(40, 180, 99, 0.3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}
            </style>

            <div className="radar-container mb-8">
                <div className="radar-outer"></div>
                <div className="radar-inner">
                    <Radar className="w-10 h-10 text-[#28B463] animate-pulse" />
                </div>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2">PetMatch está buscando tu par ideal</h3>
            <p className="text-[#28B463] font-medium tracking-tight animate-pulse h-6">
                {steps[step]}
            </p>

            <div className="mt-8 flex gap-2">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 w-8 rounded-full transition-all duration-500 ${i === step ? 'bg-[#28B463] w-12' : 'bg-slate-200'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default MatchLoading;
