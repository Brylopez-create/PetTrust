import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Loader2, CheckCircle, XCircle, Eye, Calendar, User, DollarSign } from 'lucide-react';

const AdminPaymentDashboard = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await axios.get(`${API}/admin/payments/pending`);
            setPayments(response.data);
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Error al cargar pagos pendientes');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (paymentId, action) => {
        setActionLoading(paymentId);
        try {
            await axios.patch(`${API}/admin/payments/${paymentId}/review`, { action });
            toast.success(`Pago ${action === 'approve' ? 'aprobado' : 'rechazado'} correctamente`);
            setPayments(payments.filter(p => p.id !== paymentId));
        } catch (error) {
            console.error('Review error:', error);
            toast.error('Error al procesar el pago');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#28B463] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-heading font-bold text-stone-900 mb-2">Pagos Pendientes</h1>
                <p className="text-stone-500 mb-8">Revisa y aprueba transferencias manuales</p>

                {payments.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-stone-200">
                        <CheckCircle className="w-16 h-16 text-emerald-100 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-stone-600">Bóveda Vacía</h3>
                        <p className="text-stone-400">No hay transacciones pendientes de validación en este momento.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {payments.map(payment => (
                            <Card key={payment.id} className="rounded-3xl border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row min-h-[220px]">
                                        {/* Vista del Recibo (Interactiva) */}
                                        <div
                                            className="md:w-1/4 relative group cursor-pointer bg-stone-100"
                                            onClick={() => setSelectedImage(payment.proof_image_url || payment.proof_url)}
                                        >
                                            <img
                                                src={payment.proof_image_url || payment.proof_url}
                                                alt="Comprobante"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-[#0F4C75]/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4">
                                                <Eye className="w-8 h-8 mb-2" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Ampliar Recibo</span>
                                            </div>
                                            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                                <ImageIcon className="w-3 h-3" />
                                                RECIBO DIGITAL
                                            </div>
                                        </div>

                                        {/* Torre de Control: Comparación y Auditoría */}
                                        <div className="flex-1 p-6 flex flex-col justify-between bg-white border-x border-stone-100">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-xl font-bold text-slate-800">{payment.booking_details?.owner_name}</h3>
                                                        {payment.ai_score >= 0.8 && (
                                                            <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black tracking-tighter flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" /> IA VERIFICADO
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-stone-500 font-medium flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {payment.booking_details?.date} • {payment.booking_details?.service_name}
                                                    </p>
                                                </div>

                                                <div className="flex gap-4 items-center bg-stone-50 p-3 rounded-2xl border border-stone-100">
                                                    <div className="text-center px-4 border-r border-stone-200">
                                                        <span className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Esperado</span>
                                                        <span className="text-lg font-black text-slate-700">${payment.booking_details?.expected_amount?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-center px-4">
                                                        <span className="block text-[10px] uppercase font-bold text-stone-400 mb-1">Pagado</span>
                                                        <span className={`text-lg font-black ${payment.amount === payment.booking_details?.expected_amount ? 'text-[#28B463]' : 'text-orange-500'}`}>
                                                            ${payment.amount?.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <div className="flex items-center gap-1.5 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
                                                    <Smartphone className="w-3.5 h-3.5 text-stone-500" />
                                                    <span className="text-xs font-bold text-stone-600 uppercase tracking-tighter">{payment.payment_method}</span>
                                                </div>

                                                {payment.image_hash ? (
                                                    <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 text-emerald-700">
                                                        <Shield className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-bold tracking-tighter">HASH ÚNICO (Verified)</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 text-amber-700">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-bold tracking-tighter">SIN HASH (Review required)</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100 text-sky-700 ml-auto">
                                                    <Target className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-bold tracking-tighter">AI CONFIDENCE: {Math.round(payment.ai_score * 100)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Acciones de Decisión */}
                                        <div className="md:w-1/5 bg-stone-50 p-6 flex flex-col justify-center gap-3">
                                            <Button
                                                className="w-full h-12 bg-[#28B463] hover:bg-[#1E8449] text-white rounded-xl shadow-lg shadow-emerald-200/50 font-bold transition-all hover:scale-[1.02]"
                                                onClick={() => handleReview(payment.id, 'approve')}
                                                disabled={actionLoading === payment.id}
                                            >
                                                {actionLoading === payment.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Aprobar Pago'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl font-bold"
                                                onClick={() => handleReview(payment.id, 'reject')}
                                                disabled={actionLoading === payment.id}
                                            >
                                                Rechazar
                                            </Button>
                                            <p className="text-[10px] text-center text-stone-400 mt-2 font-medium">ESTA ACCIÓN ES IRREVERSIBLE</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Full size proof"
                        className="max-w-full max-h-[90vh] rounded-lg"
                    />
                    <button className="absolute top-4 right-4 text-white hover:text-stone-300">
                        <XCircle className="w-8 h-8" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminPaymentDashboard;
