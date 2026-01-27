import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
    Key, QrCode, MapPin, Navigation, CheckCircle2,
    Loader2, Copy, Shield, AlertCircle, Play, StopCircle
} from 'lucide-react';

// PIN Generator Component for Owner
export const PinGenerator = ({ booking, onPinGenerated }) => {
    const [pin, setPin] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const generatePin = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API}/bookings/${booking.id}/generate-pin`);
            setPin(response.data.pin);
            toast.success('¡PIN generado exitosamente!');
            if (onPinGenerated) onPinGenerated(response.data.pin);
        } catch (error) {
            console.error('Error generating PIN:', error);
            toast.error(error.response?.data?.detail || 'Error al generar el PIN');
        } finally {
            setLoading(false);
        }
    };

    const copyPin = () => {
        navigator.clipboard.writeText(pin);
        setCopied(true);
        toast.success('PIN copiado');
        setTimeout(() => setCopied(false), 2000);
    };

    // Check if PIN already exists
    useEffect(() => {
        if (booking.verification_pin) {
            setPin(booking.verification_pin);
        }
    }, [booking]);

    const canGeneratePin = booking.payment_status === 'paid' && booking.status === 'confirmed';

    if (!canGeneratePin && !pin) {
        return (
            <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <p className="text-sm text-amber-700">
                        El pago debe estar confirmado para generar el PIN de verificación.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-[#28B463]/30 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-full bg-[#28B463] flex items-center justify-center">
                        <Key className="w-4 h-4 text-white" />
                    </div>
                    PIN de Verificación
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {pin ? (
                    <div className="text-center space-y-4">
                        <p className="text-sm text-stone-600">
                            Comparte este PIN con el paseador cuando llegue
                        </p>
                        <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-[#28B463]/30">
                            <p className="font-mono text-5xl font-bold tracking-[0.5em] text-[#28B463]">
                                {pin}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={copyPin}
                            className="w-full"
                        >
                            {copied ? (
                                <CheckCircle2 className="w-4 h-4 mr-2 text-[#28B463]" />
                            ) : (
                                <Copy className="w-4 h-4 mr-2" />
                            )}
                            {copied ? 'Copiado' : 'Copiar PIN'}
                        </Button>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <p className="text-sm text-stone-600">
                            Genera un PIN cuando el paseador esté listo para recoger a tu mascota
                        </p>
                        <Button
                            onClick={generatePin}
                            disabled={loading}
                            className="w-full bg-[#28B463] hover:bg-[#78C494] text-white"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Shield className="w-4 h-4 mr-2" />
                            )}
                            Generar PIN
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// PIN Verifier Component for Walker
export const PinVerifier = ({ booking, onVerified }) => {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);

    const verifyPin = async () => {
        if (pin.length !== 6) {
            toast.error('El PIN debe tener 6 dígitos');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `${API}/bookings/${booking.id}/verify-pin`,
                null,
                { params: { pin } }
            );

            if (response.data.success) {
                setVerified(true);
                toast.success(response.data.message);
                if (onVerified) onVerified();
            } else {
                toast.error(response.data.message);
                setPin('');
            }
        } catch (error) {
            console.error('Error verifying PIN:', error);
            toast.error(error.response?.data?.detail || 'Error al verificar el PIN');
        } finally {
            setLoading(false);
        }
    };

    if (verified || booking.status === 'in_progress') {
        return (
            <Card className="border-[#28B463] bg-emerald-50">
                <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#28B463] flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-[#28B463] mb-2">¡Paseo Iniciado!</h3>
                    <p className="text-sm text-stone-600">El GPS está activo. Comienza el paseo.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-stone-200">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <QrCode className="w-5 h-5 text-[#28B463]" />
                    Verificar PIN
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-stone-600">
                    Pide el PIN al dueño de la mascota para iniciar el paseo
                </p>

                <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-3xl font-mono tracking-[0.5em] h-16"
                />

                <Button
                    onClick={verifyPin}
                    disabled={loading || pin.length !== 6}
                    className="w-full bg-[#28B463] hover:bg-[#78C494] text-white"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4 mr-2" />
                    )}
                    Verificar e Iniciar Paseo
                </Button>
            </CardContent>
        </Card>
    );
};

// Live GPS Tracker Component
export const LiveGpsTracker = ({ booking, isWalker = false }) => {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [watchId, setWatchId] = useState(null);

    // Fetch location from server
    const fetchLocation = useCallback(async () => {
        try {
            const response = await axios.get(`${API}/bookings/${booking.id}/live-location`);
            setLocation(response.data);
        } catch (error) {
            console.error('Error fetching location:', error);
        } finally {
            setLoading(false);
        }
    }, [booking.id]);

    // Send location to server (for walker)
    const sendLocation = useCallback(async (position) => {
        try {
            await axios.post(`${API}/bookings/${booking.id}/update-location`, {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed
            });
        } catch (error) {
            console.error('Error updating location:', error);
        }
    }, [booking.id]);

    // Start GPS tracking for walker
    useEffect(() => {
        if (isWalker && booking.status === 'in_progress') {
            if ('geolocation' in navigator) {
                const id = navigator.geolocation.watchPosition(
                    sendLocation,
                    (error) => console.error('GPS error:', error),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
                );
                setWatchId(id);
                toast.success('GPS activado');
            }
        }

        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isWalker, booking.status, sendLocation]);

    // Poll location for owner
    useEffect(() => {
        if (!isWalker && booking.status === 'in_progress') {
            fetchLocation();
            const interval = setInterval(fetchLocation, 10000); // Poll every 10 seconds
            return () => clearInterval(interval);
        }
    }, [isWalker, booking.status, fetchLocation]);

    if (booking.status !== 'in_progress') {
        return null;
    }

    if (loading && !isWalker) {
        return (
            <Card className="border-stone-200">
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#28B463] animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-[#28B463]/30">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-full bg-[#28B463] flex items-center justify-center animate-pulse">
                        <Navigation className="w-4 h-4 text-white" />
                    </div>
                    {isWalker ? 'GPS Activo' : 'Seguimiento en Vivo'}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isWalker ? (
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-[#28B463] animate-pulse"></span>
                            <span className="text-sm font-medium text-[#28B463]">Transmitiendo ubicación</span>
                        </div>
                        <p className="text-xs text-stone-500">
                            Tu ubicación se actualiza automáticamente para el dueño
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {location?.current_location ? (
                            <div className="bg-stone-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
                                    <MapPin className="w-4 h-4 text-[#28B463]" />
                                    <span>Ubicación actual del paseador</span>
                                </div>
                                <div className="font-mono text-xs text-stone-500">
                                    {location.current_location.lat.toFixed(6)}, {location.current_location.lng.toFixed(6)}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-stone-500 text-sm">
                                Esperando ubicación del paseador...
                            </div>
                        )}

                        {/* Simple map placeholder - in production, use Google Maps or Mapbox */}
                        <div className="h-40 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="w-8 h-8 text-[#28B463] mx-auto mb-2" />
                                <p className="text-xs text-stone-500">Mapa en tiempo real</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Complete Walk Button for Walker
export const CompleteWalkButton = ({ booking, onComplete }) => {
    const [loading, setLoading] = useState(false);

    const completeWalk = async () => {
        if (!window.confirm('¿Estás seguro de que quieres finalizar el paseo?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API}/bookings/${booking.id}/complete`);
            toast.success(response.data.message);
            if (onComplete) onComplete();
        } catch (error) {
            console.error('Error completing walk:', error);
            toast.error(error.response?.data?.detail || 'Error al completar el paseo');
        } finally {
            setLoading(false);
        }
    };

    if (booking.status !== 'in_progress') {
        return null;
    }

    return (
        <Button
            onClick={completeWalk}
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <StopCircle className="w-4 h-4 mr-2" />
            )}
            Finalizar Paseo
        </Button>
    );
};

export default { PinGenerator, PinVerifier, LiveGpsTracker, CompleteWalkButton };
