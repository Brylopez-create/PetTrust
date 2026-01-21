import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
    Users,
    Clock,
    ShieldCheck,
    Smartphone,
    CheckCircle2,
    ArrowRight,
    Calculator,
    Dog
} from 'lucide-react';

const WalkersLanding = () => {
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [earnings, setEarnings] = useState(12); // horas por semana

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: '',
        city: 'Bogotá',
        type: 'expert',
        experience_years: 0,
        responses: []
    });

    const estimatedEarnings = earnings * 25000 * 4; // 25k por paseo * 4 semanas

    const handleNextStep = () => {
        if (step === 1) {
            if (!formData.name || !formData.email || !formData.whatsapp) {
                toast.error('Por favor completa tus datos básicos');
                return;
            }
        }
        setStep(step + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API}/prospects`, formData);
            toast.success('¡Solicitud recibida! Te contactaremos pronto');
            setStep(5); // Pantalla de éxito
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al enviar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    const renderHero = () => (
        <div className={`transition-all duration-700 ease-in-out ${showForm ? 'opacity-0 -translate-x-full h-0 overflow-hidden' : 'opacity-100 translate-x-0'}`}>
            <div className="relative overflow-hidden bg-white py-16 sm:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
                        <div>
                            <h1 className="text-4xl font-heading font-extrabold text-stone-900 sm:text-5xl md:text-6xl">
                                Gana dinero cuidando <span className="text-[#28B463]">lo que amas.</span>
                            </h1>
                            <p className="mt-4 text-xl text-stone-600">
                                Únete a la red de paseadores más confiable de Bogotá. Tú pones el horario, nosotros te traemos a los amigos peludos.
                            </p>
                            <div className="mt-8 flex gap-4">
                                <Button
                                    onClick={() => setShowForm(true)}
                                    className="bg-[#28B463] text-white hover:bg-[#78C494] h-14 px-8 rounded-full text-lg font-semibold shadow-lg shadow-emerald-100"
                                >
                                    Quiero ser Paseador
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                                <Button variant="outline" className="h-14 px-8 rounded-full text-lg font-semibold border-stone-200">
                                    Ver beneficios
                                </Button>
                            </div>
                        </div>
                        <div className="mt-12 lg:mt-0 relative">
                            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                                <img
                                    src="https://images.unsplash.com/photo-1551730459-92db2a308d6a?auto=format&fit=crop&q=80"
                                    alt="Paseador de perros"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-stone-100 hidden sm:block">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-100 p-3 rounded-xl">
                                        <Calculator className="w-6 h-6 text-[#28B463]" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-stone-500 font-medium">Potencial de ingresos</p>
                                        <p className="text-2xl font-bold text-stone-900">$1'200.000+ /mes</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Benefits Section */}
            <div className="bg-stone-50 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-heading font-bold text-stone-900">¿Por qué pasear con PetTrust?</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-8 text-center">
                                <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <Clock className="w-8 h-8 text-[#28B463]" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-3">Libertad Total</h3>
                                <p className="text-stone-600">Trabaja cuando quieras. Tú controlas tu propia agenda y las zonas donde te mueves.</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-8 text-center">
                                <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-3">Seguridad y Respaldo</h3>
                                <p className="text-stone-600">Cada paseo está monitoreado y cuentas con soporte de nuestro equipo en tiempo real.</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-8 text-center">
                                <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <Smartphone className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900 mb-3">Pagos Asegurados</h3>
                                <p className="text-stone-600">Recibe tus ganancias directamente en tu cuenta. Sin líos de cobrarle al cliente.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderOnboardingForm = () => (
        <div className={`max-w-2xl mx-auto px-4 py-16 transition-all duration-700 ease-in-out ${showForm ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-full">
                        Volver
                    </Button>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-[#28B463] h-full transition-all duration-500"
                            style={{ width: `${(step / 5) * 100}%` }}
                        />
                    </div>
                    <span className="text-sm font-bold text-stone-500">{step}/5</span>
                </div>
            </div>

            {step === 1 && (
                <div className="space-y-6">
                    <h2 className="text-3xl font-heading font-bold text-stone-900">Empecemos con lo básico</h2>
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Juan Pérez"
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Correo Electrónico</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@ejemplo.com"
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>WhatsApp</Label>
                            <Input
                                value={formData.whatsapp}
                                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                                placeholder="300 000 0000"
                                className="h-12 rounded-xl"
                            />
                        </div>
                    </div>
                    <Button onClick={handleNextStep} className="w-full h-12 bg-[#28B463] text-white hover:bg-[#78C494] rounded-xl">
                        Siguiente
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <h2 className="text-3xl font-heading font-bold text-stone-900">¿Cuál es tu perfil?</h2>
                    <div className="grid gap-4">
                        <div
                            onClick={() => setFormData({ ...formData, type: 'expert' })}
                            className={`p-6 border-2 rounded-3xl cursor-pointer transition-all ${formData.type === 'expert' ? 'border-[#28B463] bg-emerald-50' : 'border-stone-100 hover:border-stone-200'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-100 p-3 rounded-2xl">
                                    <CheckCircle2 className="text-[#28B463]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Ya tengo experiencia</h3>
                                    <p className="text-sm text-stone-600">He trabajado como paseador o cuidador profesionalmente.</p>
                                </div>
                            </div>
                        </div>
                        <div
                            onClick={() => setFormData({ ...formData, type: 'apprentice' })}
                            className={`p-6 border-2 rounded-3xl cursor-pointer transition-all ${formData.type === 'apprentice' ? 'border-[#28B463] bg-emerald-50' : 'border-stone-100 hover:border-stone-200'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-stone-100 p-3 rounded-2xl">
                                    <Dog className="text-stone-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Quiero aprender</h3>
                                    <p className="text-sm text-stone-600">Me encantan los perros y busco mi primera oportunidad.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleNextStep} className="w-full h-12 bg-[#28B463] text-white hover:bg-[#78C494] rounded-xl">
                        Siguiente
                    </Button>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    <h2 className="text-3xl font-heading font-bold text-stone-900">Unas preguntas de validación</h2>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>¿Dónde vives? (Barrio o Localidad)</Label>
                            <Input
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                placeholder="Ej. Chapinero, Usaquén..."
                                className="h-12 rounded-xl"
                            />
                        </div>
                        {formData.type === 'expert' ? (
                            <div className="space-y-2">
                                <Label>¿Cuántos años de experiencia tienes?</Label>
                                <Input
                                    type="number"
                                    value={formData.experience_years}
                                    onChange={e => setFormData({ ...formData, experience_years: parseInt(e.target.value) })}
                                    placeholder="0"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                        ) : (
                            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                                <p className="text-stone-600 text-sm">
                                    Al no tener experiencia, te invitaremos a una capacitación virtual obligatoria antes de tu primer paseo.
                                </p>
                            </div>
                        )}
                    </div>
                    <Button onClick={handleNextStep} className="w-full h-12 bg-[#28B463] text-white hover:bg-[#78C494] rounded-xl">
                        Siguiente
                    </Button>
                </div>
            )}

            {step === 4 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-3xl font-heading font-bold text-stone-900">Último paso</h2>
                    <Card className="rounded-3xl border-dashed border-2 border-stone-200 bg-stone-50">
                        <CardContent className="p-8 text-center">
                            <h3 className="font-bold text-stone-900 mb-2">Compromiso PetTrust</h3>
                            <p className="text-sm text-stone-600 mb-6">
                                Entiendo que para ser paseador debo pasar por una verificación de identidad y antecedentes. Mis datos serán tratados con profesionalismo.
                            </p>
                            <div className="flex items-center justify-center gap-2">
                                <input type="checkbox" required className="w-5 h-5 accent-[#28B463]" />
                                <span className="text-sm text-stone-700">Acepto los términos y condiciones</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Button type="submit" disabled={loading} className="w-full h-12 bg-[#28B463] text-white hover:bg-[#78C494] rounded-xl font-bold">
                        {loading ? 'Enviando...' : 'Enviar Solicitud'}
                    </Button>
                </form>
            )}

            {step === 5 && (
                <div className="text-center py-12">
                    <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <CheckCircle2 className="w-12 h-12 text-[#28B463]" />
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-stone-900 mb-4">¡Solicitud Recibida!</h2>
                    <p className="text-xl text-stone-600 mb-8">
                        Gracias por tu interés, {formData.name.split(' ')[0]}. Estamos revisando tu perfil y te contactaremos por WhatsApp en menos de 24 horas hábiles.
                    </p>
                    <Button onClick={() => navigate('/')} className="px-8 bg-stone-900 text-white hover:bg-stone-800 rounded-full h-12">
                        Volver al inicio
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            {renderHero()}
            {showForm && renderOnboardingForm()}
        </div>
    );
};

export default WalkersLanding;
