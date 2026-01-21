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
import { Calendar, CreditCard } from 'lucide-react';

const Booking = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [service, setService] = useState(null);
  const [pets, setPets] = useState([]);
  const [formData, setFormData] = useState({
    pet_id: '',
    date: '',
    time: '09:00'
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchService();
    fetchPets();
  }, [type, id]);

  const fetchService = async () => {
    try {
      let endpoint;
      if (type === 'walker') endpoint = 'walkers';
      else if (type === 'guarderia') endpoint = 'daycares';
      else if (type === 'daycare') endpoint = 'daycares';
      else if (type === 'veterinario') endpoint = 'vets';
      else endpoint = 'vets'; // fallback for 'vet' or other aliases

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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        time: formData.time,
        price: price
      };

      const response = await axios.post(`${API}/bookings`, bookingData);
      const booking = response.data;

      const paymentId = `demo_${Date.now()}`;
      await axios.post(`${API}/bookings/${booking.id}/payment`, null, {
        params: { payment_id: paymentId }
      });

      toast.success('¡Reserva confirmada exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.detail || 'Error al crear la reserva');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#28B463]-400 border-t-transparent"></div>
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

                  <div>
                    <Label htmlFor="date">Fecha</Label>
                    <div className="relative mt-2">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="h-12 rounded-xl pl-12"
                        min={new Date().toISOString().split('T')[0]}
                        required
                        data-testid="date-input"
                      />
                    </div>
                  </div>

                  {(type === 'walker' || type === 'veterinario' || type === 'vet') && (
                    <div>
                      <Label htmlFor="time">Hora</Label>
                      <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
                        <SelectTrigger className="mt-2 h-12 rounded-xl" id="time" data-testid="time-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="06:00">6:00 AM</SelectItem>
                          <SelectItem value="09:00">9:00 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM</SelectItem>
                          <SelectItem value="15:00">3:00 PM</SelectItem>
                          <SelectItem value="18:00">6:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="bg-stone-100 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-stone-600 mb-4">
                      <CreditCard className="w-5 h-5" />
                      <span className="font-semibold">Pago (Demo)</span>
                    </div>
                    <p className="text-sm text-stone-500">
                      En modo demo, el pago se procesa automáticamente. En producción se integraría con Stripe, PayU o Wompi.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full h-14 bg-[#28B463] text-white hover:bg-[#78C494] rounded-full text-lg font-semibold shadow-lg shadow-emerald-100"
                    data-testid="confirm-booking-btn"
                  >
                    {processing ? 'Procesando...' : 'Confirmar Reserva'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

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

                <div className="pt-4 border-t border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-stone-600">Subtotal</span>
                    <span className="font-semibold text-stone-900">
                      ${(type === 'walker' ? service.price_per_walk : (service.price_per_day || service.rates?.consultation || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold text-stone-900 pt-2 border-t border-stone-200">
                    <span>Total</span>
                    <span>${(type === 'walker' ? service.price_per_walk : (service.price_per_day || service.rates?.consultation || 0)).toLocaleString()}</span>
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

export default Booking;
