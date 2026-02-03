import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { CheckCircle, Loader2, Lock } from 'lucide-react';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password || !confirmPassword) return;

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API}/auth/reset-password`, {
                token,
                new_password: password
            });
            setSuccess(true);
            toast.success('Contraseña actualizada correctamente');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al restablecer contraseña');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-6">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Token inválido</h2>
                    <p className="text-stone-600 mb-4">No se ha proporcionado un token de restablecimiento.</p>
                    <Button onClick={() => navigate('/login')}>Ir al Login</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50">
            <Navbar />

            <div className="container mx-auto px-4 py-12 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-2xl text-[#0F4C75] flex items-center gap-2">
                            <Lock className="w-6 h-6" />
                            Nueva Contraseña
                        </CardTitle>
                        <CardDescription>
                            Ingresa tu nueva contraseña para recuperar el acceso.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <div className="text-center py-6 space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-stone-800">¡Contraseña Actualizada!</h3>
                                    <p className="text-stone-600 mt-2 text-sm">
                                        Ya puedes iniciar sesión con tu nueva contraseña.
                                    </p>
                                </div>
                                <Button onClick={() => navigate('/login')} className="w-full bg-[#28B463] hover:bg-[#219653]">
                                    Iniciar Sesión
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="pass" className="text-sm font-medium text-stone-700">Nueva Contraseña</label>
                                    <Input
                                        id="pass"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="confirm" className="text-sm font-medium text-stone-700">Confirmar Contraseña</label>
                                    <Input
                                        id="confirm"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                                            Actualizando...
                                        </>
                                    ) : (
                                        'Cambiar Contraseña'
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

export default ResetPassword;
