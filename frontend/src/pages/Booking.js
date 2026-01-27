import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, CreditCard, Clock, Users, QrCode, CheckCircle2, AlertCircle } from 'lucide-react';
import PaymentSelector from '../components/PaymentSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const Booking = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [service, setService] = useState(null);
  const [pets, setPets] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [formData, setFormData] = useState({
    pet_id: '',
    date: '',
    time: ''
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);

  useEffect(() => {
    fetchService();
    fetchPets();
  }, [type, id]);

  // Fetch slots when date changes
  useEffect(() => {
    if (formData.date && service && (type === 'walker' || type === 'vet' || type === 'veterinario')) {
      fetchSlots(formData.date);
    }
  }, [formData.date, service]);

  const fetchService = async () => {
    try {
      let endpoint;
      if (type === 'walker') endpoint = 'walkers';
      else if (type === 'guarderia') endpoint = 'daycares';
      else if (type === 'daycare') endpoint = 'daycares';
      else if (type === 'veterinario') endpoint = 'vets';
      else endpoint = 'vets';

      const response = await axios.get(`${API}/${endpoint}/${id}`);
      setService(response.data);
    } catch (error) {
      console.error('Error fetching service:', error);
      toast.error('Error al cargar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const fetchPets = async () => {
    try {
      const response = await axios.get(`${API}/pets`);
      setPets(response.data);
      if (response.data.length > 0) {
        setFormData(prev => ({ ...prev, pet_id: response.data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
    }
  };

  const fetchSlots = async (date) => {
    setSlotsLoading(true);
    try {
      const providerType = type === 'veterinario' ? 'vet' : type;
      const response = await axios.get(`${API}/providers/${providerType}/${id}/slots`, {
        params: { date }
      });
      setSlots(response.data.slots || []);

      // Auto-select first available slot
      const firstAvailable = response.data.slots?.find(s => s.available);
      if (firstAvailable) {
        setFormData(prev => ({ ...prev, time: firstAvailable.time }));
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      // Fallback to default slots
      setSlots([
        { time: '09:00', available: true, capacity_remaining: 4 },
        { time: '10:00', available: true, capacity_remaining: 4 },
        { time: '11:00', available: true, capacity_remaining: 4 },
        { time: '14:00', available: true, capacity_remaining: 4 },
        { time: '15:00', available: true, capacity_remaining: 4 },
        { time: '16:00', available: true, capacity_remaining: 4 },
        { time: '17:00', available: true, capacity_remaining: 4 }
      ]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const formatTime = (time24) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date) {
      toast.error('Por favor selecciona una fecha');
      return;
    }

    if ((type === 'walker' || type === 'vet' || type === 'veterinario') && !formData.time) {
      toast.error('Por favor selecciona un horario');
      return;
    }

    setProcessing(true);

    try {
      let price;
      if (type === 'walker') price = service.price_per_walk;
      else if (type === 'daycare' || type === 'guarderia') price = service.price_per_day;
      else price = service.rates?.consultation || 0;

      const bookingData = {
        pet_id: formData.pet_id,
        service_type: type,
        service_id: id,
        date: formData.date,
        time: formData.time || '09:00',
        price: price
      };

      const response = await axios.post(`${API}/bookings`, bookingData);
      const booking = response.data;

      setCreatedBooking(booking);
      setShowPayment(true);
      toast.success('Reserva creada. Procede al pago.');

    } catch (error) {
      console.error('Error creating booking:', error);
      const errorMsg = error.response?.data?.detail || 'Error al crear la reserva';
      toast.error(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#28B463] border-t-transparent"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-stone-600">Servicio no encontrado</p>
        </div>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Card className="rounded-3xl border-stone-200">
            <CardContent className="p-8 text-center">
              <p className="text-stone-600 mb-4">Primero necesitas agregar una mascota a tu perfil</p>
              <Button onClick={() => navigate('/dashboard')} className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full">
                Ir al Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const selectedSlot = slots.find(s => s.time === formData.time);
  const hasAvailableSlots = slots.some(s => s.available);

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-heading font-bold text-stone-900 mb-8">Confirmar Reserva</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-stone-200">
              <CardHeader>
                <CardTitle className="text-xl font-heading">Detalles de la Reserva</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Pet Selection */}
                  <div>
                    <Label htmlFor="pet">Selecciona tu Mascota</Label>
                    <Select value={formData.pet_id} onValueChange={(value) => setFormData({ ...formData, pet_id: value })}>
                      <SelectTrigger className="mt-2 h-12 rounded-xl" id="pet" data-testid="pet-select">
                        <SelectValue placeholder="Selecciona una mascota" />
                      </SelectTrigger>
                      <SelectContent>
                        {pets.map(pet => (
                          <SelectItem key={pet.id} value={pet.id}>
                            {pet.name} - {pet.breed}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Selection */}
                  <div>
                    <Label htmlFor="date">Fecha</Label>
                    <div className="relative mt-2">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value, time: '' })}
                        className="h-12 rounded-xl pl-12"
                        min={new Date().toISOString().split('T')[0]}
                        required
                        data-testid="date-input"
                      />
                    </div>
                  </div>

                  {/* Time Selection with Capacity - for Walker/Vet */}
                  {(type === 'walker' || type === 'veterinario' || type === 'vet') && formData.date && (
                    <div>
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Horario Disponible
                      </Label>

                      {slotsLoading ? (
                        <div className="mt-3 flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#28B463] border-t-transparent"></div>
                        </div>
                      ) : !hasAvailableSlots ? (
                        <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800">Sin disponibilidad para esta fecha</p>
                            <p className="text-sm text-amber-600">Por favor selecciona otra fecha</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {slots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setFormData({ ...formData, time: slot.time })}
                              className={`
                                relative p-3 rounded-xl text-sm font-medium transition-all
                                ${formData.time === slot.time
                                  ? 'bg-[#28B463] text-white ring-2 ring-[#28B463] ring-offset-2'
                                  : slot.available
                                    ? 'bg-white border-2 border-stone-200 hover:border-[#28B463] text-stone-700'
                                    : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                }
                              `}
                            >
                              <div>{formatTime(slot.time)}</div>
                              <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${formData.time === slot.time ? 'text-white/80' : 'text-stone-500'}`}>
                                <Users className="w-3 h-3" />
                                {slot.capacity_remaining} cupos
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Info */}
                  <div className="bg-gradient-to-r from-[#28B463]/10 to-[#78C494]/10 rounded-2xl p-6 border border-[#28B463]/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[#28B463] flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-stone-800">Pago por Bre-B / Nequi / Daviplata</span>
                        <p className="text-xs text-stone-500">Escanea el QR o transfiere directamente</p>
                      </div>
                    </div>
                    <p className="text-sm text-stone-600">
                      Al confirmar, te mostraremos el código QR para realizar tu pago. Un administrador validará tu transferencia y recibirás confirmación.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={processing || (type === 'walker' && !hasAvailableSlots)}
                    className="w-full h-14 bg-[#28B463] text-white hover:bg-[#78C494] rounded-full text-lg font-semibold shadow-lg shadow-emerald-100 disabled:opacity-50"
                    data-testid="confirm-booking-btn"
                  >
                    {processing ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Procesando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Confirmar Reserva
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1">
            <Card className="rounded-3xl border-stone-200 sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-stone-500 mb-1">Servicio</div>
                  <div className="font-semibold text-stone-900">{service.name}</div>
                </div>

                <div>
                  <div className="text-sm text-stone-500 mb-1">Tipo</div>
                  <div className="font-semibold text-stone-900">
                    {type === 'walker' ? 'Paseo' : (type === 'daycare' || type === 'guarderia' ? 'Guardería' : 'Veterinaria')}
                  </div>
                </div>

                {formData.date && (
                  <div>
                    <div className="text-sm text-stone-500 mb-1">Fecha</div>
                    <div className="font-semibold text-stone-900">
                      {new Date(formData.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                )}

                {formData.time && selectedSlot && (
                  <div>
                    <div className="text-sm text-stone-500 mb-1">Hora</div>
                    <div className="font-semibold text-stone-900 flex items-center gap-2">
                      {formatTime(formData.time)}
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {selectedSlot.capacity_remaining} cupos disponibles
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-stone-600">Subtotal</span>
                    <span className="font-semibold text-stone-900">
                      ${(type === 'walker' ? service.price_per_walk : (service.price_per_day || service.rates?.consultation || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold text-stone-900 pt-2 border-t border-stone-200">
                    <span>Total</span>
                    <span className="text-[#28B463]">${(type === 'walker' ? service.price_per_walk : (service.price_per_day || service.rates?.consultation || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md p-0 bg-transparent border-0 shadow-none">
          {createdBooking && (
            <PaymentSelector
              bookingId={createdBooking.id}
              amount={createdBooking.price}
              onComplete={() => {
                setShowPayment(false);
                toast.success('¡Pago enviado! El administrador validará tu transferencia.');
                navigate('/dashboard');
              }}
              onCancel={() => setShowPayment(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Booking;
