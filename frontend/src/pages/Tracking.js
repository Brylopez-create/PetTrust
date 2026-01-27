import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft, MapPin, Navigation, Clock, Activity, Dog,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Phone, Shield
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PinGenerator, LiveGpsTracker } from '../components/WalkTracking';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to center map on new location
const RecenterAutomatically = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
};

const Tracking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [booking, setBooking] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/bookings/${bookingId}`);
      setBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Error al cargar la reserva');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  const fetchLiveLocation = useCallback(async () => {
    if (!booking || booking.status !== 'in_progress') return;

    try {
      const response = await axios.get(`${API}/bookings/${bookingId}/live-location`);
      setLiveLocation(response.data);
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  }, [bookingId, booking]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  useEffect(() => {
    if (booking?.status === 'in_progress') {
      fetchLiveLocation();
      const interval = setInterval(fetchLiveLocation, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [booking?.status, fetchLiveLocation]);

  // Auto-refresh booking status
  useEffect(() => {
    const interval = setInterval(fetchBooking, 30000);
    return () => clearInterval(interval);
  }, [fetchBooking]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBooking();
    fetchLiveLocation();
  };

  const getStatusInfo = (status) => {
    const info = {
      pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
      confirmed: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
      in_progress: { label: 'En Progreso', color: 'bg-sky-100 text-sky-700', icon: Navigation },
      completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 }
    };
    return info[status] || info.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#28B463] animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-stone-600 mb-2">Reserva no encontrada</h2>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(booking.status);
  const StatusIcon = statusInfo.icon;
  const currentLocation = liveLocation?.current_location || booking.walker_current_location;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-heading font-bold text-stone-900">
              Seguimiento de Paseo
            </h1>
            <p className="text-stone-500 text-sm">Reserva #{booking.id.slice(0, 8)}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Map Section */}
          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-stone-200 overflow-hidden" data-testid="tracking-map-card">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-stone-50">
                <CardTitle className="font-heading flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#28B463]" />
                  Rastreo en Vivo
                  {booking.status === 'in_progress' && (
                    <Badge className="bg-emerald-100 text-emerald-700 rounded-full ml-auto animate-pulse">
                      En Vivo
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-emerald-100 via-sky-100 to-stone-100 relative overflow-hidden">
                  {/* Live Map */}
                  {currentLocation ? (
                    <div className="h-[400px] w-full z-0 relative">
                      <MapContainer
                        center={[currentLocation.lat, currentLocation.lng]}
                        zoom={16}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[currentLocation.lat, currentLocation.lng]}>
                          <Popup>
                            <div className="text-center">
                              <p className="font-bold mb-1">🐕 {booking.pet_name || 'Mascota'}</p>
                              <p className="text-xs text-stone-500">Última act: {new Date().toLocaleTimeString()}</p>
                            </div>
                          </Popup>
                        </Marker>
                        <RecenterAutomatically lat={currentLocation.lat} lng={currentLocation.lng} />
                      </MapContainer>

                      {/* Overlay Status Badge */}
                      <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-stone-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${statusInfo.color.split(' ')[0]} rounded-full flex items-center justify-center`}>
                                <StatusIcon className={`w-5 h-5 ${statusInfo.color.split(' ')[1]}`} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-stone-900">
                                  {booking.status === 'in_progress' ? 'Paseo en Progreso' :
                                    booking.status === 'confirmed' ? 'Esperando Verificación' :
                                      booking.status === 'completed' ? 'Paseo Finalizado' : 'Pendiente'}
                                </div>
                                <div className="text-xs text-stone-500 font-mono">
                                  Lat: {currentLocation.lat.toFixed(5)}, Lng: {currentLocation.lng.toFixed(5)}
                                </div>
                              </div>
                            </div>
                            <Badge className={`${statusInfo.color} rounded-full`}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[400px] bg-stone-100 flex flex-col items-center justify-center text-stone-400">
                      <div className="relative mb-4">
                        <div className="absolute inset-0 bg-[#28B463] blur-2xl opacity-20 rounded-full animate-pulse"></div>
                        <MapPin className="w-16 h-16 relative z-10 text-stone-300" />
                      </div>
                      <p className="font-medium text-stone-500 mb-1">Esperando ubicación...</p>
                      <p className="text-sm text-stone-400 max-w-xs text-center px-4">
                        {booking.status === 'confirmed'
                          ? 'El paseador debe iniciar el paseo usando el PIN'
                          : 'Conectando con el GPS del paseador...'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Booking Info */}
            <Card className="rounded-3xl border-stone-200" data-testid="booking-info-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Información del Paseo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.pet_name && (
                  <div className="flex items-center gap-3">
                    <Dog className="w-5 h-5 text-stone-400" />
                    <span className="font-semibold text-stone-900">{booking.pet_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-stone-400" />
                  <span className="text-stone-700">
                    {new Date(booking.date).toLocaleDateString('es-CO')} - {booking.time}
                  </span>
                </div>
                {booking.service_name && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-stone-400" />
                    <span className="text-stone-700">Paseador: {booking.service_name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PIN Section - Only for confirmed & paid bookings */}
            {booking.status === 'confirmed' && booking.payment_status === 'paid' && (
              <PinGenerator
                booking={booking}
                onPinGenerated={() => fetchBooking()}
              />
            )}

            {/* Waiting for Walker */}
            {booking.verification_pin && booking.status === 'confirmed' && (
              <Card className="rounded-3xl border-amber-200 bg-amber-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-amber-800">PIN: {booking.verification_pin}</p>
                    <p className="text-sm text-amber-600">Esperando verificación del paseador...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed Walk */}
            {booking.status === 'completed' && (
              <Card className="rounded-3xl border-emerald-200 bg-emerald-50">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-[#28B463] mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-[#28B463] mb-2">¡Paseo Completado!</h3>
                  <p className="text-sm text-stone-600">
                    {booking.completed_at && new Date(booking.completed_at).toLocaleString('es-CO')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Security Features */}
            <Card className="rounded-3xl border-stone-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Seguridad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">GPS en Tiempo Real</div>
                    <div className="text-xs text-stone-500">Actualización cada 10 segundos</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-[#28B463]" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">Verificación PIN</div>
                    <div className="text-xs text-stone-500">Confirmación segura al iniciar</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">Historial Completo</div>
                    <div className="text-xs text-stone-500">Ruta guardada del paseo</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
              <Card className="rounded-3xl border-stone-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-stone-900">Contactar Paseador</p>
                      <p className="text-sm text-stone-500">Llamar directamente</p>
                    </div>
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Phone className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
