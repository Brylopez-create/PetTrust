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
import { CheckCircle2, XCircle, Users, TrendingUp, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState({ walkers: [], daycares: [] });
  const [pendingPayments, setPendingPayments] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();

    // Poll for updates every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchData = async () => {
    // Only set loading on initial load to avoid flashing
    if (!stats) setLoading(true);
    try {
      const [statsRes, verificationsRes, paymentsRes, prospectsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/pending-verifications`),
        axios.get(`${API}/admin/payments/pending`),
        axios.get(`${API}/admin/prospects`)
      ]);
      setStats(statsRes.data);

      const allVerifications = verificationsRes.data || [];
      setPendingVerifications({
        walkers: allVerifications.filter(v => v.type === 'walker'),
        daycares: allVerifications.filter(v => v.type === 'daycare')
      });

      setPendingPayments(paymentsRes.data || []);
      setProspects(prospectsRes.data);
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
      await axios.patch(`${API}/admin/payments/${paymentId}/review`, { action });
      toast.success(action === 'approve' ? 'Pago aprobado correlamente' : 'Pago rechazado');
      fetchData();
    } catch (error) {
      toast.error('Error al procesar el pago');
    }
  };

  const handleUpdateProspect = async (prospectId, status) => {
    try {
      await axios.patch(`${API}/admin/prospects/${prospectId}`, { status });
      toast.success(`Prospecto ${status === 'approved' ? 'aprobado' : 'actualizado'}`);
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar prospecto');
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-stone-900 mb-2">Panel de Administración</h1>
            <p className="text-stone-600">Control y supervisión de la plataforma</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
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
                <TabsTrigger value="walkers">Paseadores Activos ({pendingVerifications.walkers.length})</TabsTrigger>
                <TabsTrigger value="daycares">Guarderías ({pendingVerifications.daycares.length})</TabsTrigger>
                <TabsTrigger value="prospects">Prospectos (Nuevos: {prospects.filter(p => p.status === 'pending').length})</TabsTrigger>
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
                                {walker.location_name}
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

              <TabsContent value="prospects">
                {prospects.length === 0 ? (
                  <p className="text-center text-stone-500 py-8">No hay prospectos registrados</p>
                ) : (
                  <div className="space-y-4">
                    {prospects.map((prospect) => (
                      <div key={prospect.id} className="border border-stone-200 rounded-2xl p-6 bg-white shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-heading font-bold text-lg text-stone-900">{prospect.name}</h3>
                              <Badge variant={prospect.type === 'expert' ? 'default' : 'secondary'} className="rounded-full">
                                {prospect.type === 'expert' ? 'Experto' : 'Aprendiz'}
                              </Badge>
                            </div>
                            <p className="text-stone-500 text-sm">{prospect.email} • {prospect.whatsapp}</p>
                            <p className="text-stone-400 text-xs mt-1">Ubicación: {prospect.city}</p>
                          </div>
                          <div className="mt-2 md:mt-0 flex flex-col items-end">
                            <Badge className={`rounded-full ${prospect.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              prospect.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                              {prospect.status === 'approved' ? 'Aprobado' :
                                prospect.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </Badge>
                            {prospect.total_score > 0 && (
                              <p className="text-sm font-bold text-[#0F4C75] mt-1">Score: {prospect.total_score.toFixed(1)}/5</p>
                            )}
                          </div>
                        </div>

                        {prospect.responses && prospect.responses.length > 0 && (
                          <div className="bg-stone-50 rounded-xl p-4 mb-4">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Respuestas de Validación</p>
                            <div className="space-y-2">
                              {prospect.responses.map((resp, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm border-b border-stone-100 pb-1 last:border-0 last:pb-0">
                                  <span className="text-stone-600 italic">"{resp.answer}"</span>
                                  {resp.score > 0 && <Badge variant="outline" className="text-xs">{resp.score} pts</Badge>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleUpdateProspect(prospect.id, 'approved')}
                            className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full flex-1"
                            disabled={prospect.status === 'approved'}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Aprobar Candidato
                          </Button>
                          <Button
                            onClick={() => handleUpdateProspect(prospect.id, 'rejected')}
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 rounded-full flex-1"
                            disabled={prospect.status === 'rejected'}
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
