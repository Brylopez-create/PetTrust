import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
    Heart,
    Zap,
    Shield,
    Award,
    DollarSign,
    Smile,
    ArrowRight
} from 'lucide-react';

const Benefits = () => {
    const benefits = [
        {
            title: "Pasión que paga",
            description: "Convertimos tu amor por los perros en una fuente real de ingresos. Gana dinero mientras te mantienes activo y haces nuevos amigos peludos.",
            icon: <Heart className="w-8 h-8 text-rose-500" />,
            color: "bg-rose-50"
        },
        {
            title: "Flexibilidad Extrema",
            description: "Tú decides cuándo y cuánto trabajar. Sin jefes, sin oficinas, solo tú y tu horario personalizado según tus necesidades.",
            icon: <Zap className="w-8 h-8 text-amber-500" />,
            color: "bg-amber-50"
        },
        {
            title: "Seguridad PetTrust",
            description: "Contamos con un protocolo de seguridad robusto y monitoreo GPS en tiempo real para que camines con total tranquilidad.",
            icon: <Shield className="w-8 h-8 text-emerald-500" />,
            color: "bg-emerald-50"
        },
        {
            title: "Comunidad y Crecimiento",
            description: "Accede a capacitaciones exclusivas, certificaciones y una red de cuidadores que comparten tus mismos valores.",
            icon: <Award className="w-8 h-8 text-blue-500" />,
            color: "bg-blue-50"
        },
        {
            title: "Pagos Puntuales",
            description: "Sin retrasos ni complicaciones. Recibe tus ganancias de forma semanal directamente en tu cuenta bancaria o Nequi.",
            icon: <DollarSign className="w-8 h-8 text-purple-500" />,
            color: "bg-purple-50"
        },
        {
            title: "Felicidad Garantizada",
            description: "No hay nada más gratificante que el agradecimiento de un perro feliz. Mejora tu bienestar mental y físico en cada paseo.",
            icon: <Smile className="w-8 h-8 text-orange-500" />,
            color: "bg-orange-50"
        }
    ];

    return (
        <div className="min-h-screen bg-stone-50">
            <Navbar />

            {/* Hero Section */}
            <div className="bg-[#0F4C75] text-white py-20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-[#1B262C] skew-x-12 translate-x-1/2 opacity-50"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <h1 className="text-4xl md:text-6xl font-heading font-extrabold mb-6 animate-fade-in">
                        Más que un trabajo, <br />
                        <span className="text-[#28B463]">es un estilo de vida.</span>
                    </h1>
                    <p className="text-xl text-stone-300 max-w-2xl mb-10">
                        Descubre por qué cientos de amantes de los animales han elegido PetTrust para construir su carrera como paseadores profesionales.
                    </p>
                    <Link to="/paseadores">
                        <Button className="bg-[#28B463] text-white hover:bg-[#78C494] h-14 px-8 rounded-full text-lg font-semibold shadow-xl shadow-green-900/20">
                            Comenzar ahora
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Benefits Grid */}
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-stone-900 mb-4">¿Qué ganas con PetTrust?</h2>
                    <div className="w-24 h-1 bg-[#28B463] mx-auto rounded-full"></div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {benefits.map((benefit, index) => (
                        <Card key={index} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group rounded-3xl overflow-hidden">
                            <CardContent className="p-8">
                                <div className={`${benefit.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    {benefit.icon}
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-3">{benefit.title}</h3>
                                <p className="text-stone-600 leading-relaxed">
                                    {benefit.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Testimonial / Quote */}
            <div className="bg-white py-20">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="mb-8">
                        <img
                            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80"
                            alt="Paseadora PetTrust"
                            className="w-20 h-20 rounded-full object-cover mx-auto ring-4 ring-[#28B463]/20"
                        />
                    </div>
                    <blockquote className="text-2xl font-medium text-stone-800 italic mb-6">
                        "PetTrust no solo me dio la oportunidad de trabajar con perros, sino que me hizo sentir parte de una familia que valora mi tiempo y mi pasión. Es la mejor decisión que he tomado."
                    </blockquote>
                    <cite className="text-stone-500 font-semibold not-italic">
                        — María Fernanda, Paseadora Elite en Bogotá
                    </cite>
                </div>
            </div>

            {/* CTA Section */}
            <div className="py-20 bg-stone-50">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="bg-gradient-to-br from-[#0F4C75] to-[#1B262C] rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-2xl">
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">¿Listo para dejar tu huella?</h2>
                            <p className="text-xl text-stone-300 mb-10 max-w-2xl mx-auto">
                                No esperes más para empezar a ganar dinero haciendo lo que amas. El proceso toma menos de 5 minutos.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link to="/paseadores">
                                    <Button className="w-full sm:w-auto bg-[#28B463] text-white hover:bg-[#78C494] h-14 px-10 rounded-full text-lg font-bold">
                                        Registrarme como Paseador
                                    </Button>
                                </Link>
                                <Link to="/">
                                    <Button variant="ghost" className="w-full sm:w-auto text-white hover:bg-white/10 h-14 px-10 rounded-full text-lg">
                                        Saber más sobre PetTrust
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        {/* Abstract Background Shapes */}
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#28B463] rounded-full opacity-10 blur-3xl"></div>
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Benefits;
