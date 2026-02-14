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
import { CalendarDays, MapPin, Clock, PlusCircle, CreditCard, Loader2, Key, Copy, Shield, Star, MessageSquare } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import { Textarea } from '../components/ui/textarea';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false); // New State
  const [profileData, setProfileData] = useState({ name: '', phone: '', email: '' }); // New State

  // RESTORED STATE VARIABLES
  const [showAddPet, setShowAddPet] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);

  const [newPet, setNewPet] = useState({
    name: '',
    breed: '',
    age: '',
    weight: '',
    special_needs: '',
    photo: ''
  });

  // ... (useEffect and other handlers remain the same until formatPrice) ...

  const handleOpenReview = (booking) => {
    setSelectedBooking(booking);
    setReviewData({ rating: 5, comment: '' });
    setShowReviewDialog(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewData.comment.trim()) {
      toast.error('Por favor escribe un comentario');
      return;
    }

    setReviewLoading(true);
    try {
      await axios.post(`${API}/reviews`, {
        booking_id: selectedBooking.id,
        provider_id: selectedBooking.service_id,
        rating: reviewData.rating,
        comment: reviewData.comment
      });
      toast.success('¡Gracias por tu calificación!');
      setShowReviewDialog(false);
      fetchData(); // Refresh to update has_review status
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar reseña');
    } finally {
      setReviewLoading(false);
    }
  };

  // ... (render logic) ...


  {/* ... (Pets tab content) ... */ }

  {/* Review Dialog */ }
  <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
    <DialogContent className="rounded-3xl max-w-md bg-white">
      <DialogHeader>
        <DialogTitle className="font-heading text-xl text-center">Calificar Servicio</DialogTitle>
      </DialogHeader>

      <div className="py-4">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setReviewData({ ...reviewData, rating: star })}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 ${star <= reviewData.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                />
              </button>
            ))}
          </div>
          <p className="text-stone-500 font-medium">
            {reviewData.rating === 5 ? '¡Excelente!' :
              reviewData.rating === 4 ? 'Muy bueno' :
                reviewData.rating === 3 ? 'Bueno' :
                  reviewData.rating === 2 ? 'Regular' : 'Malo'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment" className="text-stone-700">Comentario</Label>
          <Textarea
            id="comment"
            placeholder="Cuéntanos tu experiencia..."
            value={reviewData.comment}
            onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
            className="rounded-2xl border-stone-200 focus:border-[#28B463] min-h-[100px]"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setShowReviewDialog(false)}
          className="flex-1 rounded-full border-stone-200"
          disabled={reviewLoading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmitReview}
          className="flex-1 bg-[#28B463] hover:bg-[#78C494] text-white rounded-full"
          disabled={reviewLoading}
        >
          {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Reseña'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>

  {/* Payment Dialog */ }

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin');
      return;
    }
    if (user?.role === 'walker' || user?.role === 'daycare' || user?.role === 'vet') {
      navigate('/provider-dashboard');
      return;
    }
    fetchData();
    if (user) {
      setProfileData({ name: user.name, phone: user.phone || '', email: user.email });
    }
  }, [user, navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      // Assuming endpoint exists or mocking it for UX validation
      // In a real scenario, check backend/app/routers/auth.py or users.py
      await axios.put(`${API}/users/me`, profileData);
      toast.success('Perfil actualizado');
      setShowEditProfile(false);
      // Force reload user context ideally
      window.location.reload();
    } catch (error) {
      toast.error('Error al actualizar perfil');
    }
  };

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
    if (!newPet.photo) {
      toast.error('Por favor sube una foto de tu mascota');
      return;
    }
    try {
      await axios.post(`${API}/pets`, {
        ...newPet,
        age: parseInt(newPet.age),
        weight: parseFloat(newPet.weight)
      });
      toast.success('Mascota agregada exitosamente');
      setShowAddPet(false);
      setNewPet({ name: '', breed: '', age: '', weight: '', special_needs: '', photo: '' });
      fetchData();
    } catch (error) {
      toast.error('Error al agregar mascota');
    }
  };

  const handlePayBooking = async (booking) => {
    setSelectedBooking(booking);
    setShowPaymentDialog(true);
  };

  const processPayment = async () => {
    if (!selectedBooking) return;

    setPaymentLoading(true);
    try {
      const createResponse = await axios.post(`${API}/payments/wompi/create`, {
        booking_id: selectedBooking.id,
        amount: selectedBooking.price,
        currency: "COP",
        customer_email: user?.email || "cliente@pettrust.com",
        payment_method: "CARD"
      });

      await axios.post(`${API}/payments/wompi/confirm/${createResponse.data.transaction_id}`);

      toast.success('¡Pago procesado exitosamente!');
      setShowPaymentDialog(false);
      setSelectedBooking(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar el pago');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
      in_progress: 'bg-sky-100 text-sky-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    const labels = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      in_progress: 'En Progreso',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };
    return <Badge className={`${styles[status] || styles.pending} hover:${styles[status] || styles.pending} rounded-full`}>{labels[status] || status}</Badge>;
  };

  const getPaymentBadge = (status) => {
    if (status === 'paid') {
      return <Badge className="bg-emerald-100 text-emerald-700 rounded-full">Pagado</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700 rounded-full">Pendiente de Pago</Badge>;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 bg-white p-4 rounded-3xl shadow-sm border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
              {user?.profile_image ? <img src={user.profile_image} className="w-full h-full rounded-full object-cover" /> : '👤'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-stone-900 leading-none">Dashboard</h1>
              <p className="text-stone-500 text-xs sm:text-sm">Hola, {user?.name}</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-stone-200 hover:bg-stone-50"
            onClick={() => setShowEditProfile(true)}
          >
            ⚙️ <span className="hidden sm:inline ml-2">Configurar</span>
          </Button>
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
          <DialogContent className="rounded-3xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={profileData.email} disabled className="bg-stone-100 text-stone-500" />
              </div>
              <Button type="submit" className="w-full bg-[#0F4C75] text-white rounded-full">
                Guardar Cambios
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="mb-8" data-testid="dashboard-tabs">
            <TabsTrigger value="bookings" data-testid="bookings-tab">Mis Reservas</TabsTrigger>
            <TabsTrigger value="pets" data-testid="pets-tab">Mis Mascotas</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#28B463]-400 border-t-transparent mx-auto"></div>
              </div>
            ) : bookings.length === 0 ? (
              <Card className="rounded-3xl border-stone-200">
                <CardContent className="p-12 text-center">
                  <p className="text-stone-600 mb-4">Aún no tienes reservas</p>
                  <Button
                    onClick={() => navigate('/explorar')}
                    className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full"
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

                      {booking.service_name && (
                        <p className="font-semibold text-stone-900 mb-2">{booking.service_name}</p>
                      )}
                      {booking.pet_name && (
                        <p className="text-sm text-stone-600 mb-3">🐕 {booking.pet_name}</p>
                      )}

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-stone-600">
                          <CalendarDays className="w-4 h-4" />
                          <span className="text-sm">{new Date(booking.date).toLocaleDateString('es-CO')}</span>
                        </div>
                        {booking.time && (
                          <div className="flex items-center gap-2 text-stone-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{booking.time}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl font-heading font-bold text-stone-900">
                          {formatPrice(booking.price)}
                        </span>
                        {getPaymentBadge(booking.payment_status)}
                      </div>

                      {/* PIN Section for paid confirmed bookings */}
                      {booking.payment_status === 'paid' && booking.status === 'confirmed' && booking.service_type === 'walker' && (
                        <div className="bg-emerald-50 rounded-xl p-3 mb-3 border border-emerald-200">
                          {booking.verification_pin ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-[#28B463]" />
                                <span className="text-sm font-medium text-emerald-700">PIN:</span>
                                <span className="font-mono font-bold text-lg text-[#28B463] tracking-wider">{booking.verification_pin}</span>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full"
                                onClick={() => {
                                  navigator.clipboard.writeText(booking.verification_pin);
                                  toast.success('PIN copiado');
                                }}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await axios.post(`${API}/bookings/${booking.id}/generate-pin`);
                                  toast.success('¡PIN generado!');
                                  fetchData(); // Refresh to show PIN
                                } catch (error) {
                                  toast.error(error.response?.data?.detail || 'Error al generar PIN');
                                }
                              }}
                              className="w-full bg-[#28B463] hover:bg-[#78C494] text-white"
                            >
                              <Key className="w-4 h-4 mr-2" />
                              Generar PIN para el paseador
                            </Button>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-3 border-t border-stone-100">
                        {booking.payment_status !== 'paid' && booking.status !== 'cancelled' && (
                          <Button
                            onClick={() => handlePayBooking(booking)}
                            size="sm"
                            className="flex-1 bg-[#78C494] text-white hover:bg-[#28B463] rounded-full"
                            data-testid={`pay-booking-btn-${booking.id}`}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                        {(booking.status === 'confirmed' || booking.status === 'in_progress') && booking.service_type === 'walker' && (
                          <Button
                            onClick={() => navigate(`/tracking/${booking.id}`)}
                            size="sm"
                            className="flex-1 bg-sky-100 text-sky-700 hover:bg-sky-200 rounded-full"
                            data-testid={`track-booking-btn-${booking.id}`}
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            Rastrear
                          </Button>
                        )}

                        {booking.status === 'completed' && !booking.has_review && (
                          <Button
                            onClick={() => handleOpenReview(booking)}
                            size="sm"
                            className="flex-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-full border border-amber-200"
                          >
                            <Star className="w-4 h-4 mr-1 fill-amber-700" />
                            Calificar
                          </Button>
                        )}

                        {booking.status === 'completed' && booking.has_review && (
                          <div className="flex-1 text-center py-2 text-xs font-bold text-stone-400 uppercase tracking-wider bg-stone-50 rounded-full border border-stone-100">
                            ★ Calificado
                          </div>
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
                  <Button className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full" data-testid="add-pet-btn">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Agregar Mascota
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl max-h-[85vh] overflow-y-auto sm:max-w-md bg-white p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl text-center">Nueva Mascota</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddPet} className="space-y-3">

                    <div className="flex justify-center -mt-2 mb-2">
                      <div className="w-24 sm:w-28">
                        <ImageUpload
                          folder="pets"
                          label=""
                          required={true}
                          onUploadComplete={(url) => setNewPet({ ...newPet, photo: url })}
                          currentImage={newPet.photo}
                          compact={true}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="name" className="text-xs">Nombre</Label>
                        <Input
                          id="name"
                          value={newPet.name}
                          onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                          className="mt-1 h-9 sm:h-10 rounded-xl"
                          required
                          data-testid="pet-name-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="breed" className="text-xs">Raza</Label>
                        <Input
                          id="breed"
                          value={newPet.breed}
                          onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                          className="mt-1 h-9 sm:h-10 rounded-xl"
                          required
                          data-testid="pet-breed-input"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="age" className="text-xs">Edad (años)</Label>
                        <Input
                          id="age"
                          type="number"
                          value={newPet.age}
                          onChange={(e) => setNewPet({ ...newPet, age: e.target.value })}
                          className="mt-1 h-9 sm:h-10 rounded-xl"
                          required
                          data-testid="pet-age-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="weight" className="text-xs">Peso (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          value={newPet.weight}
                          onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                          className="mt-1 h-9 sm:h-10 rounded-xl"
                          required
                          data-testid="pet-weight-input"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="special_needs" className="text-xs">Necesidades Especiales (Opcional)</Label>
                      <Input
                        id="special_needs"
                        value={newPet.special_needs}
                        onChange={(e) => setNewPet({ ...newPet, special_needs: e.target.value })}
                        className="mt-1 h-9 sm:h-10 rounded-xl"
                        data-testid="pet-special-needs-input"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#28B463] text-white hover:bg-[#78C494] rounded-xl h-10 sm:h-11 mt-2" data-testid="submit-pet-btn">
                      Guardar Mascota
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#28B463]-400 border-t-transparent mx-auto"></div>
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
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-stone-100 rounded-full mx-auto flex items-center justify-center overflow-hidden mb-3">
                          {pet.photo ? (
                            <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl">🐶</span>
                          )}
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Pagar Reserva</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              <div className="bg-stone-50 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-stone-600">Servicio</span>
                  <span className="font-semibold">{selectedBooking.service_type === 'walker' ? 'Paseo' : 'Guardería'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Fecha</span>
                  <span className="font-semibold">{new Date(selectedBooking.date).toLocaleDateString('es-CO')}</span>
                </div>
                {selectedBooking.pet_name && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">Mascota</span>
                    <span className="font-semibold">{selectedBooking.pet_name}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-stone-200">
                  <span className="text-stone-900 font-semibold">Total</span>
                  <span className="text-2xl font-bold text-[#28B463]">
                    {formatPrice(selectedBooking.price)}
                  </span>
                </div>
              </div>

              <div className="bg-purple-50 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src="https://cdn.worldvectorlogo.com/logos/wompi.svg"
                    alt="Wompi"
                    className="h-6"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-sm font-medium text-purple-700">Pago Seguro con Wompi</span>
                </div>
                <p className="text-xs text-purple-600">
                  Modo Sandbox - Pagos de prueba
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPaymentDialog(false)}
                  variant="outline"
                  className="flex-1 rounded-full"
                  disabled={paymentLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={processPayment}
                  className="flex-1 bg-[#78C494] hover:bg-[#28B463] text-white rounded-full"
                  disabled={paymentLoading}
                  data-testid="confirm-payment-btn"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pagar Ahora
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="rounded-3xl max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-center">Calificar Servicio</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewData({ ...reviewData, rating: star })}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${star <= reviewData.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-stone-500 font-medium">
                {reviewData.rating === 5 ? '¡Excelente!' :
                  reviewData.rating === 4 ? 'Muy bueno' :
                    reviewData.rating === 3 ? 'Bueno' :
                      reviewData.rating === 2 ? 'Regular' : 'Malo'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment" className="text-stone-700">Comentario</Label>
              <Textarea
                id="comment"
                placeholder="Cuéntanos tu experiencia..."
                value={reviewData.comment}
                onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                className="rounded-2xl border-stone-200 focus:border-[#28B463] min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              className="flex-1 rounded-full border-stone-200"
              disabled={reviewLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitReview}
              className="flex-1 bg-[#28B463] hover:bg-[#78C494] text-white rounded-full"
              disabled={reviewLoading}
            >
              {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Reseña'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
