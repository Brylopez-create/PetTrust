import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Star, MapPin, Shield, CheckCircle2, Award, Clock, Heart, MessageCircle } from 'lucide-react';
import ChatCenter from '../components/ChatCenter';

const WalkerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [walker, setWalker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchWalker();
    fetchReviews();
  }, [id]);

  const fetchWalker = async () => {
    try {
      const response = await axios.get(`${API}/walkers/${id}`);
      setWalker(response.data);
    } catch (error) {
      console.error('Error fetching walker:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/walker/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await axios.post(`${API}/conversations`, {
        provider_id: id,
        provider_type: 'walker'
      });
      setShowChat(true);
    } catch (error) {
      toast.error('Error al iniciar conversación');
    }
  };

  const handleBooking = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/reservar/walker/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!walker) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-stone-600">Paseador no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl border-stone-200" data-testid="walker-profile-card">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  <Avatar className="w-32 h-32 rounded-2xl">
                    <AvatarImage src={walker.profile_image} alt={walker.name} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-emerald-100 to-stone-100 rounded-2xl">
                      {walker.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h1 className="text-3xl font-heading font-bold text-stone-900 mb-2">{walker.name}</h1>
                        <div className="flex items-center gap-2 text-stone-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span>{walker.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {walker.verified && (
                        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 rounded-full" data-testid="verified-badge">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verificado
                        </Badge>
                      )}
                      {walker.insured && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-full" data-testid="insured-badge">
                          <Shield className="w-3 h-3 mr-1" />
                          Asegurado
                        </Badge>
                      )}
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 rounded-full">
                        <Award className="w-3 h-3 mr-1" />
                        {walker.experience_years} años de experiencia
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-lg font-bold text-stone-900">{walker.rating}</span>
                        <span className="text-stone-500">({walker.reviews_count} reseñas)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-stone-900 mb-2">Sobre Mí</h2>
                    <p className="text-stone-600 leading-relaxed">{walker.bio}</p>
                  </div>

                  {walker.certifications && walker.certifications.length > 0 && (
                    <div>
                      <h2 className="text-xl font-heading font-bold text-stone-900 mb-3">Certificaciones</h2>
                      <div className="flex flex-wrap gap-2">
                        {walker.certifications.map((cert, index) => (
                          <Badge key={index} className="bg-purple-100 text-purple-700 hover:bg-purple-100 rounded-full">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {walker.gallery_images && walker.gallery_images.length > 0 && (
              <Card className="rounded-3xl border-stone-200">
                <CardContent className="p-8">
                  <h2 className="text-xl font-heading font-bold text-stone-900 mb-4">Galería</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {walker.gallery_images.map((img, index) => (
                      <div key={index} className="aspect-square rounded-2xl overflow-hidden">
                        <img src={img} alt={`Galería ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-3xl border-stone-200">
              <CardContent className="p-8">
                <h2 className="text-xl font-heading font-bold text-stone-900 mb-4">
                  Reseñas ({reviews.length})
                </h2>
                {reviews.length === 0 ? (
                  <p className="text-stone-500 text-center py-8">Aún no hay reseñas</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-stone-100 pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-1">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-sm text-stone-500">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-stone-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="rounded-3xl border-stone-200 sticky top-24">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="text-4xl font-heading font-bold text-stone-900 mb-2">
                    ${walker.price_per_walk.toLocaleString()}
                  </div>
                  <div className="text-stone-500">por paseo</div>
                </div>

                <Button
                  onClick={handleBooking}
                  className="w-full h-14 bg-emerald-400 text-white hover:bg-emerald-500 rounded-full text-lg font-semibold shadow-lg shadow-emerald-100 mb-3"
                  data-testid="book-walker-btn"
                >
                  Reservar Paseo
                </Button>

                <Button
                  onClick={handleStartChat}
                  variant="outline"
                  className="w-full h-12 rounded-full border-stone-200 hover:bg-stone-50 mb-4"
                  data-testid="chat-walker-btn"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar Mensaje
                </Button>

                <div className="space-y-3 pt-6 border-t border-stone-200">
                  <div className="flex items-center gap-3 text-stone-600">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Respuesta en menos de 24h</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-600">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Seguro incluido</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-600">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">GPS en tiempo real</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-600">
                    <Heart className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Reporte de bienestar</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Chat Center */}
      <ChatCenter isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
};

export default WalkerProfile;