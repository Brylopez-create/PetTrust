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
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import {
  Inbox, Calendar, Settings, MapPin, Clock, DollarSign,
  CheckCircle, XCircle, AlertCircle, User, Dog, Loader2
} from 'lucide-react';
import { LiveGpsTracker } from '../components/WalkTracking';

const AMENITIES_OPTIONS = [
  "Cámaras de seguridad", "Transporte", "Zonas verdes", "Piscina",
  "Aire acondicionado", "Juegos interactivos", "Entrenamiento básico", "Spa/Grooming"
];

const SPECIALTIES_OPTIONS = [
  "Medicina General", "Cirugía", "Dermatología", "Odontología",
  "Oftalmología", "Fisioterapia", "Comportamiento", "Urgencias"
];

// Inline PIN Verifier for dialog use
const PinVerifierInline = ({ booking, onVerified }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

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
        if (onVerified) onVerified();
      } else {
        toast.error(response.data.message);
        setPin('');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al verificar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
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
          <CheckCircle className="w-4 h-4 mr-2" />
        )}
        Verificar e Iniciar Paseo
      </Button>
    </div>
  );
};

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
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({});
  const [editAmenities, setEditAmenities] = useState([]);
  const [editWorkingHours, setEditWorkingHours] = useState({});
  const [editSpecialties, setEditSpecialties] = useState([]);

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

        // Initialize form data
        setEditForm({
          bio: response.data.bio || response.data.description || '',
          price: response.data.price_per_walk || response.data.price_per_day || (response.data.rates ? response.data.rates.consultation : 0),
          experience_years: response.data.experience_years || 0,
          location_name: response.data.location_name || response.data.location || '',
        });

        // Initialize arrays
        setEditAmenities(response.data.amenities || []);
        setEditSpecialties(response.data.specialties || []);
        setEditWorkingHours(response.data.working_hours || {
          monday: { start: "08:00", end: "18:00", enabled: true },
          tuesday: { start: "08:00", end: "18:00", enabled: true },
          wednesday: { start: "08:00", end: "18:00", enabled: true },
          thursday: { start: "08:00", end: "18:00", enabled: true },
          friday: { start: "08:00", end: "18:00", enabled: true },
          saturday: { start: "09:00", end: "14:00", enabled: true },
          sunday: { start: "08:00", end: "18:00", enabled: false },
        });
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
      // Fetch all upcoming bookings
      const response = await axios.get(`${API}/providers/me/schedule`);
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
      setProfile(prev => ({ ...prev, is_active: newStatus }));
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

  const handleCheckboxChange = (checked, item, list, setList) => {
    if (checked) {
      setList([...list, item]);
    } else {
      setList(list.filter((i) => i !== item));
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const payload = {};
      if (user.role === 'walker') {
        payload.bio = editForm.bio;
        payload.price_per_walk = parseFloat(editForm.price);
        payload.experience_years = parseInt(editForm.experience_years);
      } else if (user.role === 'daycare') {
        payload.bio = editForm.bio;
        payload.price_per_day = parseFloat(editForm.price);
        payload.amenities = editAmenities;
      } else if (user.role === 'vet') {
        payload.bio = editForm.bio;
        payload.experience_years = parseInt(editForm.experience_years);
        payload.specialties = editSpecialties;
        payload.rates = { consultation: parseFloat(editForm.price) };
      }

      // Shared fields
      if (editForm.location_name) payload.location_name = editForm.location_name;
      payload.working_hours = editWorkingHours;

      const res = await axios.patch(`${API}/providers/me/profile`, payload);
      toast.success("Perfil actualizado");
      setIsEditing(false);
      fetchProfile(); // Refresh
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al actualizar perfil");
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
          <Loader2 className="w-8 h-8 animate-spin text-[#28B463]" />
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
                Necesitas crear tu perfil de {user?.role === 'walker' ? 'paseador' : user?.role === 'daycare' ? 'Guardería' : 'Veterinario'} para comenzar a recibir solicitudes.
              </p>
              <Button
                onClick={() => navigate('/crear-perfil')}
                className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full"
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
                <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-[#78C494] animate-pulse' : 'bg-stone-300'}`}></span>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-2xl border-stone-200 overflow-hidden group shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-tighter">Balance Disponible</p>
                  <p className="text-2xl font-black text-slate-800">
                    {formatPrice(schedule.total_earnings || 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-fit">
                <CheckCircle className="w-3 h-3" /> LISTO PARA RETIRO
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-stone-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-tighter">Próximos Cobros</p>
                  <p className="text-2xl font-black text-slate-700">
                    {formatPrice(schedule.pending_earnings || 0)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] font-bold text-stone-400 uppercase">En servicios activos</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-stone-200 shadow-sm" data-testid="capacity-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Dog className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-tighter">Carga de Trabajo</p>
                  <p className="text-2xl font-black text-slate-700">
                    {schedule.capacity_used} / {capacityMax}
                  </p>
                </div>
              </div>
              <Slider
                value={[capacityMax]}
                onValueCommit={handleCapacityChange}
                max={user?.role === 'walker' ? 6 : 50}
                min={1}
                step={1}
                className="py-2"
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-stone-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-tighter">Solicitudes</p>
                  <p className="text-2xl font-black text-slate-700">{inbox.length}</p>
                </div>
              </div>
              <Badge className={`rounded-full h-5 text-[10px] font-black tracking-tighter ${inbox.length > 0 ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-400'}`}>
                {inbox.length > 0 ? `${inbox.length} NUEVAS` : 'SIN PENDIENTES'}
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
            <TabsTrigger value="finance" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Finanzas
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
                    className={`rounded-2xl border-2 transition-all ${item.is_expired ? 'border-stone-200 opacity-60' : 'border-[#28B463]-200 hover:border-[#28B463]-300'
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
                            <p className="text-2xl font-bold text-[#28B463]">
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
                                className="rounded-full bg-[#78C494] hover:bg-[#28B463] text-white px-6"
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
            {schedule.bookings.length === 0 ? (
              <Card className="rounded-3xl border-stone-200">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                  <h3 className="text-xl font-heading font-bold text-stone-900 mb-2">
                    Sin reservas próximas
                  </h3>
                  <p className="text-stone-600">
                    Tus próximas reservas aparecerán aquí.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4" data-testid="schedule-list">
                {schedule.bookings.map((booking) => (
                  <Card
                    key={booking.id}
                    className={`rounded-2xl border-2 ${booking.status === 'in_progress'
                      ? 'border-[#28B463] bg-emerald-50/50'
                      : booking.status === 'confirmed'
                        ? 'border-sky-200'
                        : 'border-stone-200'
                      }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center text-2xl">
                            🐕
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-heading font-bold text-stone-900 text-lg">
                                {booking.pet_name}
                              </h3>
                              <Badge className={`rounded-full text-xs ${booking.status === 'in_progress'
                                ? 'bg-[#28B463] text-white'
                                : booking.status === 'confirmed'
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-stone-100 text-stone-600'
                                }`}>
                                {booking.status === 'in_progress' ? 'En Progreso' :
                                  booking.status === 'confirmed' ? 'Confirmado' : booking.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {booking.owner_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {booking.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(booking.date).toLocaleDateString('es-CO')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <p className="text-xl font-bold text-[#28B463]">
                            {formatPrice(booking.price)}
                          </p>

                          {/* PIN Verification for Confirmed Bookings */}
                          {booking.status === 'confirmed' && booking.payment_status === 'paid' && booking.verification_pin && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-sky-500 hover:bg-sky-600 text-white rounded-full"
                                >
                                  Verificar PIN e Iniciar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Verificar PIN</DialogTitle>
                                  <DialogDescription>
                                    Ingresa el PIN de 6 dígitos que te dará el dueño para iniciar el paseo.
                                  </DialogDescription>
                                </DialogHeader>
                                <PinVerifierInline
                                  booking={booking}
                                  onVerified={() => {
                                    fetchSchedule();
                                    toast.success('¡Paseo iniciado! GPS activado.');
                                  }}
                                />
                              </DialogContent>
                            </Dialog>
                          )}

                          {/* Waiting for PIN */}
                          {booking.status === 'confirmed' && (!booking.verification_pin) && (
                            <Badge className="bg-amber-100 text-amber-700 rounded-full text-xs">
                              Esperando PIN del dueño
                            </Badge>
                          )}

                          {/* Walk in Progress - Complete Button */}
                          {booking.status === 'in_progress' && (
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!window.confirm('¿Finalizar el paseo?')) return;
                                try {
                                  await axios.post(`${API}/bookings/${booking.id}/complete`);
                                  toast.success('¡Paseo completado!');
                                  fetchSchedule();
                                } catch (error) {
                                  toast.error('Error al completar');
                                }
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white rounded-full"
                            >
                              Finalizar Paseo
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* GPS Status for In Progress */}
                      {booking.status === 'in_progress' && (
                        <div className="mt-4">
                          <LiveGpsTracker booking={booking} isWalker={true} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="finance">
            <Card className="rounded-3xl border-stone-200 overflow-hidden">
              <CardHeader className="bg-stone-50/50 border-b border-stone-100">
                <CardTitle className="font-heading flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Historial de Ganancias
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!schedule.history || schedule.history.length === 0 ? (
                  <div className="p-12 text-center">
                    <Inbox className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-stone-500 font-medium">No hay servicios completados aún.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-widest">
                        <tr>
                          <th className="px-6 py-4 text-left">Servicio / Mascota</th>
                          <th className="px-6 py-4 text-left">Fecha</th>
                          <th className="px-6 py-4 text-right">Monto</th>
                          <th className="px-6 py-4 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {schedule.history.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs">
                                  {item.pet_name?.substring(0, 1)}
                                </div>
                                <span className="font-bold text-stone-800">{item.pet_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-stone-500 font-medium">
                              {new Date(item.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-700">
                              {formatPrice(item.price)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-full text-[10px] font-black uppercase">
                                Pago Recibido
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card className="rounded-2xl border-stone-200 shadow-sm bg-gradient-to-br from-[#28B463]/5 to-transparent">
                <CardContent className="p-6">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Desempeño Mensual</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-black text-slate-800">{schedule.monthly_stats?.completed_count || 0}</p>
                      <p className="text-xs font-bold text-stone-400">Servicios Completados</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-emerald-600">{formatPrice(schedule.monthly_stats?.total_value || 0)}</p>
                      <p className="text-xs font-bold text-stone-400">Total Ganado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="rounded-3xl border-stone-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading">Configuración del Perfil</CardTitle>
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-full">
                      Editar Perfil
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Editar Perfil</DialogTitle>
                      <DialogDescription>
                        Realiza cambios en tu perfil público y tarifas.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bio" className="text-right">
                          Bio/Desc
                        </Label>
                        <Textarea
                          id="bio"
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          className="col-span-3"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">
                          Precio Base
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          className="col-span-3"
                        />
                      </div>

                      {(user.role === 'walker' || user.role === 'vet') && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="exp" className="text-right">
                            Exp (Años)
                          </Label>
                          <Input
                            id="exp"
                            type="number"
                            value={editForm.experience_years}
                            onChange={(e) => setEditForm({ ...editForm, experience_years: e.target.value })}
                            className="col-span-3"
                          />
                        </div>
                      )}

                      {user.role === 'vet' && (
                        <div className="grid grid-cols-4 gap-4">
                          <Label className="text-right mt-2">
                            Especialidades
                          </Label>
                          <div className="col-span-3 grid grid-cols-2 gap-2 border rounded-md p-2">
                            {SPECIALTIES_OPTIONS.map((item) => (
                              <div key={item} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`edit-spec-${item}`}
                                  checked={editSpecialties.includes(item)}
                                  onCheckedChange={(checked) => handleCheckboxChange(checked, item, editSpecialties, setEditSpecialties)}
                                />
                                <label
                                  htmlFor={`edit-spec-${item}`}
                                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {item}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {user.role === 'daycare' && (
                        <div className="grid grid-cols-4 gap-4">
                          <Label className="text-right mt-2">
                            Amenidades
                          </Label>
                          <div className="col-span-3 grid grid-cols-2 gap-2 border rounded-md p-2">
                            {AMENITIES_OPTIONS.map((item) => (
                              <div key={item} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`edit-amenity-${item}`}
                                  checked={editAmenities.includes(item)}
                                  onCheckedChange={(checked) => handleCheckboxChange(checked, item, editAmenities, setEditAmenities)}
                                />
                                <label
                                  htmlFor={`edit-amenity-${item}`}
                                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {item}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="col-span-4 border-t pt-4 mt-2">
                        <Label className="text-sm font-bold mb-3 block text-[#28B463] uppercase tracking-tighter flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Gestión de Jornada Semanal
                        </Label>
                        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                            <div key={day} className="flex items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                              <div className="flex items-center gap-2 w-24">
                                <Checkbox
                                  id={`day-${day}`}
                                  checked={editWorkingHours[day]?.enabled}
                                  onCheckedChange={(checked) => setEditWorkingHours({
                                    ...editWorkingHours,
                                    [day]: { ...editWorkingHours[day], enabled: checked }
                                  })}
                                />
                                <Label htmlFor={`day-${day}`} className="text-[10px] font-black uppercase text-stone-600 cursor-pointer">
                                  {day.substring(0, 3)}
                                </Label>
                              </div>

                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  type="time"
                                  className="h-8 text-[11px] font-bold px-2 rounded-lg"
                                  value={editWorkingHours[day]?.start}
                                  disabled={!editWorkingHours[day]?.enabled}
                                  onChange={(e) => setEditWorkingHours({
                                    ...editWorkingHours,
                                    [day]: { ...editWorkingHours[day], start: e.target.value }
                                  })}
                                />
                                <span className="text-[10px] font-bold text-stone-400">A</span>
                                <Input
                                  type="time"
                                  className="h-8 text-[11px] font-bold px-2 rounded-lg"
                                  value={editWorkingHours[day]?.end}
                                  disabled={!editWorkingHours[day]?.enabled}
                                  onChange={(e) => setEditWorkingHours({
                                    ...editWorkingHours,
                                    [day]: { ...editWorkingHours[day], end: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                    <DialogFooter>
                      <Button type="button" onClick={handleUpdateProfile}>Guardar Cambios</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                    <p className="font-semibold text-stone-900">{profile.location_name}</p>
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
    </div >
  );
};

export default ProviderDashboard;
