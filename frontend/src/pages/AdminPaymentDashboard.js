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
                    <div className="text-center py-12 bg-white rounded-3xl border border-stone-200">
                        <CheckCircle className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-stone-600">¡Todo al día!</h3>
                        <p className="text-stone-500">No hay pagos pendientes de revisión.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {payments.map(payment => (
                            <Card key={payment.id} className="rounded-2xl border-stone-200 hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-[#28B463]" />
                                                ${payment.amount.toLocaleString()}
                                            </CardTitle>
                                            <CardDescription className="capitalize badge bg-stone-100 px-2 py-0.5 rounded text-xs mt-1 inline-block">
                                                {payment.payment_method}
                                            </CardDescription>
                                        </div>
                                        <span className="text-xs font-mono text-stone-400">
                                            {new Date(payment.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2 text-sm text-stone-600 bg-stone-50 p-3 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            <span className="font-medium">{payment.booking_details?.owner_name || 'Usuario'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>{payment.booking_details?.date} - {payment.booking_details?.service_name}</span>
                                        </div>
                                    </div>

                                    <div className="relative group cursor-pointer" onClick={() => setSelectedImage(payment.proof_image_url || payment.proof_url)}>
                                        <img
                                            src={payment.proof_image_url || payment.proof_url}
                                            alt="Comprobante"
                                            className="w-full h-32 object-cover rounded-xl border border-stone-200"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                            <Eye className="w-8 h-8 text-white" />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => handleReview(payment.id, 'reject')}
                                            disabled={actionLoading === payment.id}
                                        >
                                            {actionLoading === payment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                            Rechazar
                                        </Button>
                                        <Button
                                            className="flex-1 bg-[#28B463] hover:bg-[#78C494] text-white"
                                            onClick={() => handleReview(payment.id, 'approve')}
                                            disabled={actionLoading === payment.id}
                                        >
                                            {actionLoading === payment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                            Aprobar
                                        </Button>
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
