import React, { useState, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import ImageUpload from './ImageUpload';
import { CheckCircle, Loader2, Copy, QrCode, Smartphone, ImageIcon, ScanLine, AlertTriangle } from 'lucide-react';

const PaymentSelector = ({ bookingId, amount, onComplete, onCancel }) => {
    const [method, setMethod] = useState(null); // 'breb' | 'nequi' | 'daviplata'
    const [proofUrl, setProofUrl] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState('select'); // 'select', 'qr', 'upload', 'success'

    // La llave de transferencia Bre-B/Nequi/Daviplata
    const PAYMENT_KEY = "0091484291";

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Llave copiada al portapapeles');
    };

    const handleSubmit = async () => {
        if (!proofUrl) {
            toast.error('Debes subir el comprobante de pago');
            return;
        }

        setSubmitting(true);
        try {
            const paymentData = {
                booking_id: bookingId,
                amount: amount,
                payment_method: method,
                proof_url: proofUrl
            };

            await axios.post(`${API}/payments/register_manual`, paymentData);

            setStep('success');
            setTimeout(() => {
                onComplete();
            }, 3000);

        } catch (error) {
            console.error(error);
            toast.error('Error al enviar el comprobante');
        } finally {
            setSubmitting(false);
        }
    };

    // Success State
    if (step === 'success') {
        return (
            <Card className="w-full max-w-md mx-auto text-center p-8 border-[#28B463] bg-gradient-to-b from-emerald-50 to-white">
                <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-full bg-[#28B463] flex items-center justify-center animate-bounce">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-[#28B463] mb-2">¡Comprobante Enviado!</h3>
                <p className="text-stone-600 mb-4">Tu pago está siendo verificado por nuestro equipo.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                        <p className="font-medium">Próximamente: Pasarela de Pagos Completa</p>
                        <p className="text-xs mt-1">Pronto podrás pagar con tarjeta directamente. Por ahora, un administrador validará tu transferencia.</p>
                    </div>
                </div>
            </Card>
        );
    }

    // Method Selection
    if (step === 'select') {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">Pago de Reserva</CardTitle>
                    <CardDescription>Transfiere <span className="font-bold text-[#28B463]">${amount?.toLocaleString()}</span> usando cualquiera de estos métodos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Bre-B Option */}
                    <button
                        onClick={() => { setMethod('breb'); setStep('qr'); }}
                        className="w-full p-4 rounded-xl border-2 border-stone-200 hover:border-[#00A1E4] hover:bg-blue-50 transition-all flex items-center gap-4 group"
                    >
                        <div className="w-12 h-12 bg-[#00A1E4] rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">B</span>
                        </div>
                        <div className="text-left flex-1">
                            <span className="font-semibold text-stone-800 group-hover:text-[#00A1E4] block">Bre-B</span>
                            <span className="text-xs text-stone-500">Enviar a la llave</span>
                        </div>
                        <Smartphone className="w-6 h-6 text-stone-400 group-hover:text-[#00A1E4]" />
                    </button>

                    {/* Nequi Option */}
                    <button
                        onClick={() => { setMethod('nequi'); setStep('qr'); }}
                        className="w-full p-4 rounded-xl border-2 border-stone-200 hover:border-[#E40046] hover:bg-pink-50 transition-all flex items-center gap-4 group"
                    >
                        <div className="w-12 h-12 bg-gradient-to-br from-[#E40046] to-[#FF6B9D] rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">N</span>
                        </div>
                        <div className="text-left flex-1">
                            <span className="font-semibold text-stone-800 group-hover:text-[#E40046] block">Nequi</span>
                            <span className="text-xs text-stone-500">Llave: {PAYMENT_KEY}</span>
                        </div>
                        <Smartphone className="w-6 h-6 text-stone-400 group-hover:text-[#E40046]" />
                    </button>

                    {/* Daviplata Option */}
                    <button
                        onClick={() => { setMethod('daviplata'); setStep('qr'); }}
                        className="w-full p-4 rounded-xl border-2 border-stone-200 hover:border-[#D32F2F] hover:bg-red-50 transition-all flex items-center gap-4 group"
                    >
                        <div className="w-12 h-12 bg-[#D32F2F] rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">D</span>
                        </div>
                        <div className="text-left flex-1">
                            <span className="font-semibold text-stone-800 group-hover:text-[#D32F2F] block">Daviplata</span>
                            <span className="text-xs text-stone-500">Llave: {PAYMENT_KEY}</span>
                        </div>
                        <Smartphone className="w-6 h-6 text-stone-400 group-hover:text-[#D32F2F]" />
                    </button>

                    <div className="text-center pt-3 border-t border-stone-100 mt-4">
                        <Button variant="ghost" onClick={onCancel} className="text-stone-500 hover:text-stone-700">
                            Cancelar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // QR Code Display
    if (step === 'qr') {
        const methodColors = {
            breb: { bg: '#00A1E4', name: 'Bre-B' },
            nequi: { bg: '#E40046', name: 'Nequi' },
            daviplata: { bg: '#D32F2F', name: 'Daviplata' }
        };
        const { bg, name } = methodColors[method] || methodColors.breb;

        return (
            <Card className="w-full max-w-md mx-auto overflow-hidden">
                <div style={{ backgroundColor: bg }} className="p-6 text-white text-center">
                    <h3 className="text-2xl font-bold mb-1">{name}</h3>
                    <p className="text-white/80 text-sm">Monto a pagar: <span className="font-bold text-lg">${amount?.toLocaleString()}</span></p>
                </div>

                <CardContent className="p-6 space-y-6">
                    {/* Key Display - No Image */}
                    <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                            <Smartphone className="w-8 h-8 text-stone-400" />
                        </div>

                        <p className="text-sm text-stone-500 mb-2">Transfiere a la llave:</p>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="font-mono font-bold text-3xl tracking-widest text-stone-900">{PAYMENT_KEY}</span>
                        </div>

                        <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full hover:bg-stone-50"
                            onClick={() => handleCopy(PAYMENT_KEY)}
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Llave
                        </Button>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2 text-sm text-stone-600">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#28B463] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                            <p>Abre tu app de {name} y escanea el QR o busca la llave</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#28B463] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                            <p>Transfiere exactamente <span className="font-bold">${amount?.toLocaleString()}</span></p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#28B463] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                            <p>Toma captura de pantalla del comprobante</p>
                        </div>
                    </div>

                    <Button
                        className="w-full h-12 bg-[#28B463] hover:bg-[#78C494] text-white rounded-xl font-semibold"
                        onClick={() => setStep('upload')}
                    >
                        <ImageIcon className="w-5 h-5 mr-2" />
                        Ya pagué, subir comprobante
                    </Button>

                    <Button variant="ghost" onClick={() => setStep('select')} className="w-full text-stone-500">
                        ← Elegir otro método
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Upload Proof Step
    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-[#28B463]" />
                    Subir Comprobante
                </CardTitle>
                <CardDescription>
                    Sube la captura de tu transferencia de <span className="font-bold">${amount?.toLocaleString()}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <ImageUpload
                    folder="payments"
                    onUploadComplete={setProofUrl}
                    label="Comprobante de Pago"
                    required
                />

                {proofUrl && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Comprobante subido correctamente
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep('qr')}>
                        ← Atrás
                    </Button>
                    <Button
                        className="flex-1 bg-[#28B463] hover:bg-[#78C494] text-white"
                        onClick={handleSubmit}
                        disabled={!proofUrl || submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Enviando...
                            </>
                        ) : (
                            'Enviar Comprobante'
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default PaymentSelector;
