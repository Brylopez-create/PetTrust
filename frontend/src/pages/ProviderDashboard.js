import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Inbox, Calendar, Settings, MapPin, Clock, DollarSign,
  CheckCircle, XCircle, AlertCircle, User, Dog, Loader2
} from 'lucide-react';

const ProviderDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [schedule, setSchedule] = useState({ bookings: [], capacity_max: 4, capacity_used: 0 });
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [capacityMax, setCapacityMax] = useState(4);

  useEffect(() => {
    if (!user || (user.role !== 'walker' && user.role !== 'daycare' && user.role !== 'vet')) {
      navigate('/dashboard');
      return;
    }
    fetchData();
    const interval = setInterval(fetchInbox, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProfile(), fetchInbox(), fetchSchedule()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/providers/me/profile`);
      if (response.data) {
        setProfile(response.data);
        setIsActive(response.data.is_active || false);
        setCapacityMax(response.data.capacity_max || response.data.capacity_total || 4);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchInbox = async () => {
    try {
      const response = await axios.get(`${API}/providers/me/inbox`);
      setInbox(response.data);
    } catch (error) {
      console.error('Error fetching inbox:', error);
    }
  };

  const fetchSchedule = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${API}/providers/me/schedule?date=${today}`);
      setSchedule(response.data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const handleStatusToggle = async (newStatus) => {
    try {
      await axios.patch(`${API}/providers/me/status`, { is_active: newStatus });
      setIsActive(newStatus);
      toast.success(newStatus ? 'Ahora estás recibiendo solicitudes' : 'Has pausado las solicitudes');
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleCapacityChange = async (newCapacity) => {
    try {
      await axios.patch(`${API}/providers/me/status`, { capacity_max: newCapacity[0] });
      setCapacityMax(newCapacity[0]);
      toast.success(`Capacidad actualizada a ${newCapacity[0]}`);
    } catch (error) {
      toast.error('Error al actualizar capacidad');
    }
  };

  const handleRespond = async (inboxId, action) => {
    setResponding(inboxId);
    try {
      const response = await axios.post(`${API}/providers/me/inbox/${inboxId}/respond?action=${action}`);

      if (action === 'accept') {
        toast.success('¡Solicitud aceptada! Se ha creado la reserva.');
      } else {
        toast.info('Solicitud rechazada');
      }

      await Promise.all([fetchInbox(), fetchSchedule()]);
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al responder';
      toast.error(message);
    } finally {
      setResponding(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card className="rounded-3xl border-stone-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-heading font-bold text-stone-900 mb-2">
                Perfil no configurado
              </h2>
              <p className="text-stone-600 mb-6">
                Necesitas crear tu perfil de {user?.role === 'walker' ? 'paseador' : 'guardería'} para comenzar a recibir solicitudes.
              </p>
              <Button
                onClick={() => navigate('/crear-perfil')}
                className="bg-emerald-400 text-white hover:bg-emerald-500 rounded-full"
              >
                Completar Perfil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-stone-900 mb-2">
              Panel de {user?.role === 'walker' ? 'Paseador' : user?.role === 'daycare' ? 'Guardería' : 'Veterinario'}
            </h1>
            <p className="text-stone-600">Bienvenido, {profile.name}</p>
          </div>

          <Card className="rounded-2xl border-stone-200 p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`}></span>
                <span className="font-medium text-stone-700">
                  {isActive ? 'Recibiendo solicitudes' : 'Pausado'}
                </span>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={handleStatusToggle}
                data-testid="active-toggle"
              />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="rounded-2xl border-stone-200" data-testid="capacity-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Dog className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-600">Capacidad Hoy</p>
                  <p className="text-2xl font-bold text-stone-900">
                    {schedule.capacity_used} / {capacityMax}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Máximo</span>
                  <span className="font-medium">{capacityMax} {user?.role === 'walker' ? 'perros' : 'cupos'}</span>
                </div>
                <Slider
                  value={[capacityMax]}
                  onValueCommit={handleCapacityChange}
                  max={user?.role === 'walker' ? 6 : 50}
                  min={1}
                  step={1}
                  className="py-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-stone-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-600">Solicitudes Pendientes</p>
                  <p className="text-2xl font-bold text-stone-900">{inbox.length}</p>
                </div>
              </div>
              {inbox.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 rounded-full">
                  {inbox.length} nuevas
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-stone-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-600">Precio por {user?.role === 'walker' ? 'Paseo' : 'Día'}</p>
                  <p className="text-2xl font-bold text-stone-900">
                    {formatPrice(profile.price_per_walk || profile.price_per_day)}
                  </p>
                </div>
              </div>
              <Badge className={`rounded-full ${profile.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                {profile.verified ? '✓ Verificado' : 'Pendiente verificación'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="mb-6" data-testid="provider-tabs">
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="w-4 h-4" />
              Bandeja de Entrada
              {inbox.length > 0 && (
                <Badge className="bg-red-500 text-white ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  {inbox.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="w-4 h-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox">
            {inbox.length === 0 ? (
              <Card className="rounded-3xl border-stone-200">
                <CardContent className="p-12 text-center">
                  <Inbox className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                  <h3 className="text-xl font-heading font-bold text-stone-900 mb-2">
                    Sin solicitudes pendientes
                  </h3>
                  <p className="text-stone-600">
                    {isActive
                      ? 'Las nuevas solicitudes aparecerán aquí cuando lleguen.'
                      : 'Activa tu estado para recibir solicitudes.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4" data-testid="inbox-list">
                {inbox.map((item) => (
                  <Card
                    key={item.id}
                    className={`rounded-2xl border-2 transition-all ${item.is_expired ? 'border-stone-200 opacity-60' : 'border-emerald-200 hover:border-emerald-300'
                      }`}
                    data-testid={`inbox-item-${item.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center text-2xl">
                            🐕
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-heading font-bold text-stone-900 text-lg">
                                {item.pet_name}
                              </h3>
                              {item.pet_breed && (
                                <Badge className="bg-stone-100 text-stone-600 rounded-full text-xs">
                                  {item.pet_breed}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {item.owner_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {item.distance_km} km
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.service_date).toLocaleDateString('es-CO')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.service_time}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">
                              {formatPrice(item.earnings)}
                            </p>
                            {!item.is_expired && item.expires_in_seconds > 0 && (
                              <p className="text-xs text-amber-600 flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3" />
                                Expira en {formatTime(item.expires_in_seconds)}
                              </p>
                            )}
                          </div>

                          {item.is_expired ? (
                            <Badge className="bg-stone-100 text-stone-500 rounded-full">
                              Expirada
                            </Badge>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleRespond(item.id, 'reject')}
                                variant="outline"
                                size="sm"
                                disabled={responding === item.id}
                                className="rounded-full border-red-200 text-red-600 hover:bg-red-50"
                                data-testid={`reject-btn-${item.id}`}
                              >
                                {responding === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                onClick={() => handleRespond(item.id, 'accept')}
                                size="sm"
                                disabled={responding === item.id}
                                className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-6"
                                data-testid={`accept-btn-${item.id}`}
                              >
                                {responding === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Aceptar
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="rounded-3xl border-stone-200">
              <CardHeader>
                <CardTitle className="font-heading">Agenda de Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                {schedule.bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-600">No tienes reservas para hoy</p>
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="schedule-list">
                    {schedule.bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl"
                        data-testid={`schedule-item-${booking.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900">{booking.time || 'Sin hora'}</p>
                            <p className="text-sm text-stone-600">{booking.pet_name} - {booking.owner_name}</p>
                          </div>
                        </div>
                        <Badge className={`rounded-full ${booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                            booking.status === 'in_progress' ? 'bg-sky-100 text-sky-700' :
                              'bg-stone-100 text-stone-600'
                          }`}>
                          {booking.status === 'confirmed' ? 'Confirmado' :
                            booking.status === 'in_progress' ? 'En progreso' : booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="rounded-3xl border-stone-200">
              <CardHeader>
                <CardTitle className="font-heading">Configuración del Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-stone-50 rounded-2xl">
                    <p className="text-sm text-stone-600 mb-1">Rating</p>
                    <p className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                      ⭐ {profile.rating?.toFixed(1) || '5.0'}
                      <span className="text-sm font-normal text-stone-500">
                        ({profile.reviews_count || 0} reseñas)
                      </span>
                    </p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-2xl">
                    <p className="text-sm text-stone-600 mb-1">Radio de Acción</p>
                    <p className="text-2xl font-bold text-stone-900">
                      {profile.radius_km || profile.pickup_radius_km || 5} km
                    </p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-2xl">
                    <p className="text-sm text-stone-600 mb-1">Ubicación</p>
                    <p className="font-semibold text-stone-900">{profile.location}</p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-2xl">
                    <p className="text-sm text-stone-600 mb-1">Estado de Verificación</p>
                    <Badge className={`rounded-full ${profile.verification_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        profile.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      {profile.verification_status === 'approved' ? 'Aprobado' :
                        profile.verification_status === 'pending' ? 'En revisión' : 'Rechazado'}
                    </Badge>
                  </div>
                </div>

                {user?.role === 'daycare' && profile.pickup_service && (
                  <div className="p-4 bg-purple-50 rounded-2xl">
                    <p className="text-sm text-purple-600 mb-1">Servicio de Recogida</p>
                    <p className="font-semibold text-purple-900">
                      Activo - {formatPrice(profile.pickup_price)} adicional
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProviderDashboard;
