import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CheckCircle2, XCircle, Users, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState({ walkers: [], daycares: [] });
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, verificationsRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/pending-verifications`),
        axios.get(`${API}/admin/payments/pending`)
      ]);
      setStats(statsRes.data);
      setPendingVerifications(verificationsRes.data);
      setPendingPayments(paymentsRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWalker = async (walkerId, approved) => {
    try {
      await axios.patch(`${API}/walkers/${walkerId}/verify?verified=${approved}`);
      toast.success(approved ? 'Paseador aprobado' : 'Paseador rechazado');
      fetchData();
    } catch (error) {
      toast.error('Error al procesar verificación');
    }
  };

  const handleReviewPayment = async (paymentId, action) => {
    try {
      await axios.patch(`${API}/admin/payments/${paymentId}/review?action=${action}`);
      toast.success(action === 'approve' ? 'Pago aprobado correlamente' : 'Pago rechazado');
      fetchData();
    } catch (error) {
      toast.error('Error al procesar el pago');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#28B463]-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-stone-900 mb-2">Panel de Administración</h1>
          <p className="text-stone-600">Control y supervisión de la plataforma</p>
        </div>

        {stats && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="rounded-3xl border-stone-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-stone-500 mb-1">Total Reservas</div>
                    <div className="text-3xl font-heading font-bold text-stone-900">{stats.total_bookings}</div>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#28B463]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-stone-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-stone-500 mb-1">Paseadores</div>
                    <div className="text-3xl font-heading font-bold text-stone-900">{stats.total_walkers}</div>
                  </div>
                  <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-sky-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-stone-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-stone-500 mb-1">Paseos Completados</div>
                    <div className="text-3xl font-heading font-bold text-stone-900">{stats.completed_bookings}</div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-stone-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-stone-500 mb-1">Incidencias Abiertas</div>
                    <div className="text-3xl font-heading font-bold text-stone-900">{stats.pending_incidents}</div>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="rounded-3xl border-stone-200">
          <CardHeader>
            <CardTitle className="font-heading">Verificaciones Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="walkers">
              <TabsList className="mb-6">
                <TabsTrigger value="walkers">Paseadores ({pendingVerifications.walkers.length})</TabsTrigger>
                <TabsTrigger value="daycares">Guarderías ({pendingVerifications.daycares.length})</TabsTrigger>
                <TabsTrigger value="payments">Pagos Manuales ({pendingPayments.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="walkers">
                {pendingVerifications.walkers.length === 0 ? (
                  <p className="text-center text-stone-500 py-8">No hay verificaciones pendientes</p>
                ) : (
                  <div className="space-y-4">
                    {pendingVerifications.walkers.map((walker) => (
                      <div key={walker.id} className="border border-stone-200 rounded-2xl p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-heading font-bold text-lg text-stone-900 mb-2">{walker.name}</h3>
                            <p className="text-stone-600 text-sm mb-3">{walker.bio}</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge className="bg-stone-100 text-stone-700 hover:bg-stone-100">
                                {walker.location}
                              </Badge>
                              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                                {walker.experience_years} años experiencia
                              </Badge>
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                ${walker.price_per_walk.toLocaleString()}/paseo
                              </Badge>
                            </div>
                            {walker.certifications && walker.certifications.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm font-semibold text-stone-700 mb-1">Certificaciones:</div>
                                <div className="flex flex-wrap gap-2">
                                  {walker.certifications.map((cert, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{cert}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <Button
                            onClick={() => handleVerifyWalker(walker.id, true)}
                            className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full flex-1"
                            data-testid={`approve-walker-${walker.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Aprobar
                          </Button>
                          <Button
                            onClick={() => handleVerifyWalker(walker.id, false)}
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 rounded-full flex-1"
                            data-testid={`reject-walker-${walker.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="daycares">
                {pendingVerifications.daycares.length === 0 ? (
                  <p className="text-center text-stone-500 py-8">No hay verificaciones pendientes</p>
                ) : (
                  <div className="space-y-4">
                    {pendingVerifications.daycares.map((daycare) => (
                      <div key={daycare.id} className="border border-stone-200 rounded-2xl p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-heading font-bold text-lg text-stone-900 mb-2">{daycare.name}</h3>
                            <p className="text-stone-600 text-sm mb-3">{daycare.description}</p>
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              ${daycare.price_per_day.toLocaleString()}/día
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <Button className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full flex-1">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Aprobar
                          </Button>
                          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-full flex-1">
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments">
                {pendingPayments.length === 0 ? (
                  <p className="text-center text-stone-500 py-8">No hay pagos pendientes de revisión</p>
                ) : (
                  <div className="space-y-4">
                    {pendingPayments.map((payment) => (
                      <div key={payment.id} className="border border-stone-200 rounded-2xl p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-full md:w-48 h-64 bg-stone-100 rounded-xl overflow-hidden cursor-pointer" onClick={() => window.open(payment.proof_image_url, '_blank')}>
                            <img src={payment.proof_image_url} alt="Comprobante Nequi" className="w-full h-full object-contain" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-heading font-bold text-lg text-stone-900">Pago Manual Nequi</h3>
                                <p className="text-stone-500 text-sm">ID: {payment.id}</p>
                              </div>
                              <Badge className="bg-amber-100 text-amber-700">Pendiente</Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="bg-stone-50 p-3 rounded-xl">
                                <div className="text-xs text-stone-500 mb-1">Monto</div>
                                <div className="font-bold text-[#0F4C75]">${payment.amount.toLocaleString()}</div>
                              </div>
                              <div className="bg-stone-50 p-3 rounded-xl">
                                <div className="text-xs text-stone-500 mb-1">Reserva</div>
                                <div className="font-bold text-stone-700">{payment.booking_id}</div>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <Button
                                onClick={() => handleReviewPayment(payment.id, 'approve')}
                                className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full flex-1"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Aprobar Pago
                              </Button>
                              <Button
                                onClick={() => handleReviewPayment(payment.id, 'reject')}
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 rounded-full flex-1"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Rechazar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
