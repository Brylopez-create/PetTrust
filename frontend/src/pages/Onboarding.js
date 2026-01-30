import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, MapPin, ShieldCheck, ChevronRight } from 'lucide-react';

const Onboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    const slides = [
        {
            id: 1,
            title: "Encuentra al Cuidador Ideal",
            desc: "Perfiles verificados de Paseadores, Veterinarias y Guarderías cerca de ti.",
            icon: <PawPrint className="w-16 h-16 text-[#F4D35E]" />,
            bg: "bg-[#0F4C75]"
        },
        {
            id: 2,
            title: "Rastreo GPS en Vivo",
            desc: "Sigue cada paso de tu mascota durante su paseo en tiempo real.",
            icon: <MapPin className="w-16 h-16 text-[#F4D35E]" />,
            bg: "bg-[#3282B8]"
        },
        {
            id: 3,
            title: "Pagos Seguros",
            desc: "Tu dinero está protegido hasta que el servicio se complete con éxito.",
            icon: <ShieldCheck className="w-16 h-16 text-[#F4D35E]" />,
            bg: "bg-[#1B262C]"
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setStep((prev) => (prev + 1) % slides.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-stone-50">
            {/* Visual Content Area */}
            <div className={`flex-1 relative overflow-hidden transition-colors duration-700 ease-in-out ${slides[step].bg}`}>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white z-10">
                    <div className="mb-6 p-6 bg-white/10 backdrop-blur-md rounded-full ring-4 ring-white/20 animate-fade-in-up">
                        {slides[step].icon}
                    </div>
                    <h1 className="text-3xl font-bold mb-4 font-montserrat animate-fade-in-up delay-100">
                        {slides[step].title}
                    </h1>
                    <p className="text-lg text-white/90 leading-relaxed font-light animate-fade-in-up delay-200">
                        {slides[step].desc}
                    </p>
                </div>

                {/* Abstract Background Shapes */}
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] opacity-10 pointer-events-none">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,79.6,-46.3C87.4,-33.5,90.1,-18,88.4,-3.3C86.7,11.3,80.7,25.1,72.2,37.2C63.7,49.3,52.7,59.7,40.3,66.5C27.9,73.3,14,76.5,0.7,75.3C-12.6,74.1,-25.2,68.5,-36.5,60.8C-47.8,53.1,-57.8,43.3,-65.4,31.7C-73,20.1,-78.2,6.7,-77.3,-6.3C-76.4,-19.3,-69.4,-31.9,-60.1,-42.6C-50.8,-53.3,-39.2,-62.1,-26.6,-70.3C-14,-78.5,-0.4,-86.1,13.8,-86.2C28,-86.3,56,-78.9,44.7,-76.4Z" transform="translate(100 100)" />
                    </svg>
                </div>
            </div>

            {/* Indicators */}
            <div className="bg-white pt-6 pb-2 px-6 flex justify-center gap-2">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[#0F4C75]' : 'w-2 bg-gray-300'
                            }`}
                    />
                ))}
            </div>

            {/* Action Buttons */}
            <div className="bg-white p-8 pt-4 pb-12 flex flex-col gap-4">
                <button
                    onClick={() => navigate('/registro')}
                    className="w-full bg-[#0F4C75] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    Empezar Ahora
                    <ChevronRight className="w-5 h-5" />
                </button>
                <button
                    onClick={() => navigate('/login')}
                    className="w-full bg-stone-100 text-[#0F4C75] py-4 rounded-xl font-semibold text-lg hover:bg-stone-200 transition-colors"
                >
                    Ya tengo cuenta
                </button>
            </div>
        </div>
    );
};

export default Onboarding;
