import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { CalendarDays, MapPin, Clock, PlusCircle, CreditCard, Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPet, setShowAddPet] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [newPet, setNewPet] = useState({
    name: '',
    breed: '',
    age: '',
    weight: '',
    special_needs: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin');
      return;
    }
    if (user?.role === 'walker' || user?.role === 'daycare') {
      navigate('/provider-dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, petsRes] = await Promise.all([
        axios.get(`${API}/bookings`),
        axios.get(`${API}/pets`)
      ]);
      setBookings(bookingsRes.data);
      setPets(petsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPet = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/pets`, {
        ...newPet,
        age: parseInt(newPet.age),
        weight: parseFloat(newPet.weight)
      });
      toast.success('Mascota agregada exitosamente');
      setShowAddPet(false);
      setNewPet({ name: '', breed: '', age: '', weight: '', special_needs: '' });
      fetchData();
    } catch (error) {
      toast.error('Error al agregar mascota');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    const labels = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };
    return <Badge className={`${styles[status]} hover:${styles[status]} rounded-full`}>{labels[status]}</Badge>;
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-stone-900 mb-2">Dashboard</h1>
            <p className="text-stone-600">Bienvenido, {user?.name}</p>
          </div>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="mb-8" data-testid="dashboard-tabs">
            <TabsTrigger value="bookings" data-testid="bookings-tab">Mis Reservas</TabsTrigger>
            <TabsTrigger value="pets" data-testid="pets-tab">Mis Mascotas</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent mx-auto"></div>
              </div>
            ) : bookings.length === 0 ? (
              <Card className="rounded-3xl border-stone-200">
                <CardContent className="p-12 text-center">
                  <p className="text-stone-600 mb-4">Aún no tienes reservas</p>
                  <Button
                    onClick={() => navigate('/explorar')}
                    className="bg-emerald-400 text-white hover:bg-emerald-500 rounded-full"
                    data-testid="explore-services-btn"
                  >
                    Explorar Servicios
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="bookings-grid">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="rounded-3xl border-stone-200 hover:shadow-lg transition-shadow" data-testid={`booking-card-${booking.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 rounded-full">
                          {booking.service_type === 'walker' ? 'Paseo' : 'Guardería'}
                        </Badge>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-stone-600">
                          <CalendarDays className="w-4 h-4" />
                          <span className="text-sm">{new Date(booking.date).toLocaleDateString()}</span>
                        </div>
                        {booking.time && (
                          <div className="flex items-center gap-2 text-stone-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{booking.time}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                        <span className="text-2xl font-heading font-bold text-stone-900">
                          ${booking.price.toLocaleString()}
                        </span>
                        {booking.status === 'confirmed' && booking.service_type === 'walker' && (
                          <Button
                            onClick={() => navigate(`/tracking/${booking.id}`)}
                            size="sm"
                            className="bg-sky-100 text-sky-700 hover:bg-sky-200 rounded-full"
                            data-testid={`track-booking-btn-${booking.id}`}
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            Rastrear
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pets">
            <div className="mb-6">
              <Dialog open={showAddPet} onOpenChange={setShowAddPet}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-400 text-white hover:bg-emerald-500 rounded-full" data-testid="add-pet-btn">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Agregar Mascota
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Agregar Nueva Mascota</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddPet} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        value={newPet.name}
                        onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                        className="mt-2 h-12 rounded-xl"
                        required
                        data-testid="pet-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="breed">Raza</Label>
                      <Input
                        id="breed"
                        value={newPet.breed}
                        onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                        className="mt-2 h-12 rounded-xl"
                        required
                        data-testid="pet-breed-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="age">Edad (años)</Label>
                        <Input
                          id="age"
                          type="number"
                          value={newPet.age}
                          onChange={(e) => setNewPet({ ...newPet, age: e.target.value })}
                          className="mt-2 h-12 rounded-xl"
                          required
                          data-testid="pet-age-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="weight">Peso (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          value={newPet.weight}
                          onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                          className="mt-2 h-12 rounded-xl"
                          required
                          data-testid="pet-weight-input"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="special_needs">Necesidades Especiales (Opcional)</Label>
                      <Input
                        id="special_needs"
                        value={newPet.special_needs}
                        onChange={(e) => setNewPet({ ...newPet, special_needs: e.target.value })}
                        className="mt-2 h-12 rounded-xl"
                        data-testid="pet-special-needs-input"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-emerald-400 text-white hover:bg-emerald-500 rounded-full" data-testid="submit-pet-btn">
                      Agregar
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent mx-auto"></div>
              </div>
            ) : pets.length === 0 ? (
              <Card className="rounded-3xl border-stone-200">
                <CardContent className="p-12 text-center">
                  <p className="text-stone-600">Aún no has agregado mascotas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="pets-grid">
                {pets.map((pet) => (
                  <Card key={pet.id} className="rounded-3xl border-stone-200" data-testid={`pet-card-${pet.id}`}>
                    <CardContent className="p-6">
                      <div className="text-center mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-stone-100 rounded-full mx-auto flex items-center justify-center text-4xl mb-3">
                          🐶
                        </div>
                        <h3 className="text-xl font-heading font-bold text-stone-900 mb-1">{pet.name}</h3>
                        <p className="text-stone-600 text-sm">{pet.breed}</p>
                      </div>
                      <div className="space-y-2 text-sm text-stone-600">
                        <div className="flex justify-between">
                          <span>Edad:</span>
                          <span className="font-semibold">{pet.age} años</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Peso:</span>
                          <span className="font-semibold">{pet.weight} kg</span>
                        </div>
                        {pet.special_needs && (
                          <div className="pt-2 border-t border-stone-100">
                            <span className="text-xs text-stone-500">Necesidades especiales:</span>
                            <p className="text-stone-600 mt-1">{pet.special_needs}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;