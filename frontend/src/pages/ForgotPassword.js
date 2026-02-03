import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            await axios.post(`${API}/auth/request-password-reset`, { email });
            setSent(true);
            toast.success('Si el correo existe, recibirás un enlace de recuperación');
        } catch (error) {
            toast.error('Error al procesar la solicitud');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50">
            <Navbar />

            <div className="container mx-auto px-4 py-12 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="-ml-3 text-stone-500">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Volver
                            </Button>
                        </div>
                        <CardTitle className="text-2xl text-[#0F4C75]">Recuperar Contraseña</CardTitle>
                        <CardDescription>
                            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sent ? (
                            <div className="text-center py-6 space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                    <Mail className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-stone-800">¡Correo Enviado!</h3>
                                    <p className="text-stone-600 mt-2 text-sm">
                                        Revisa tu bandeja de entrada (y spam). Si el correo coincide con una cuenta, recibirás las instrucciones.
                                    </p>
                                </div>
                                <Button onClick={() => navigate('/login')} className="w-full bg-[#28B463] hover:bg-[#219653]" variant="outline">
                                    Volver al Login
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-stone-700">email</label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-[#28B463] hover:bg-[#219653] text-white"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar Enlace'
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ForgotPassword;
