import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { MapPin, Navigation, Clock, Activity } from 'lucide-react';

const Tracking = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [trackingPoints, setTrackingPoints] = useState([]);
  const [currentLocation, setCurrentLocation] = useState({ lat: 4.6951, lng: -74.0621 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
    fetchTracking();
    const interval = setInterval(simulateMovement, 3000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const response = await axios.get(`${API}/bookings`);
      const foundBooking = response.data.find(b => b.id === bookingId);
      setBooking(foundBooking);
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async () => {
    try {
      const response = await axios.get(`${API}/tracking/${bookingId}`);
      setTrackingPoints(response.data);
      if (response.data.length > 0) {
        const latest = response.data[0];
        setCurrentLocation({ lat: latest.latitude, lng: latest.longitude });
      }
    } catch (error) {
      console.error('Error fetching tracking:', error);
    }
  };

  const simulateMovement = () => {
    setCurrentLocation(prev => ({
      lat: prev.lat + (Math.random() - 0.5) * 0.001,
      lng: prev.lng + (Math.random() - 0.5) * 0.001
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-stone-600">Reserva no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-stone-200 overflow-hidden" data-testid="tracking-map-card">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-stone-50">
                <CardTitle className="font-heading flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Rastreo en Vivo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-emerald-100 via-sky-100 to-stone-100 relative overflow-hidden">
                  <div 
                    className="absolute w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-1000 ease-in-out animate-pulse"
                    style={{
                      left: `${((currentLocation.lng + 74.0621) / 0.02) * 100}%`,
                      top: `${((4.6951 - currentLocation.lat) / 0.02) * 100}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <Navigation className="w-6 h-6 text-white" />
                  </div>

                  <div className="absolute inset-0 pointer-events-none">
                    <svg className="w-full h-full opacity-20">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Activity className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-stone-900">Paseo en Progreso</div>
                          <div className="text-xs text-stone-500">Ubicación actualizada en tiempo real</div>
                        </div>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-full pulse-badge">
                        En Vivo
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-stone-50 border-t border-stone-200">
                  <div className="text-xs text-stone-500 mb-2">Coordenadas Actuales</div>
                  <div className="font-mono text-sm text-stone-700">
                    Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                  </div>
                  <p className="text-xs text-stone-500 mt-3">
                    <strong>Demo Mode:</strong> Este es un mapa simulado con movimiento aleatorio. 
                    En producción se integraría con Google Maps API para rastreo GPS real.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-3xl border-stone-200" data-testid="booking-info-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Información del Paseo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-stone-500 mb-1">Fecha</div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-stone-400" />
                    <span className="font-semibold text-stone-900">
                      {new Date(booking.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {booking.time && (
                  <div>
                    <div className="text-sm text-stone-500 mb-1">Hora</div>
                    <div className="font-semibold text-stone-900">{booking.time}</div>
                  </div>
                )}

                <div className="pt-4 border-t border-stone-200">
                  <div className="text-sm text-stone-500 mb-1">Estado</div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-full">
                    En Progreso
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-stone-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Características de Seguridad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">GPS en Tiempo Real</div>
                    <div className="text-xs text-stone-500">Ubicación actualizada cada 3 segundos</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">Historial Completo</div>
                    <div className="text-xs text-stone-500">Guarda toda la ruta del paseo</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">Reporte al Finalizar</div>
                    <div className="text-xs text-stone-500">Recibirás checklist de bienestar</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
