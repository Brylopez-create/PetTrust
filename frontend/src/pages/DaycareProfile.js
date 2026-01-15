import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Star, MapPin, Shield, CheckCircle2, Camera, Leaf, Truck } from 'lucide-react';

const DaycareProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [daycare, setDaycare] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDaycare();
    fetchReviews();
  }, [id]);

  const fetchDaycare = async () => {
    try {
      const response = await axios.get(`${API}/daycares/${id}`);
      setDaycare(response.data);
    } catch (error) {
      console.error('Error fetching daycare:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/daycare/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleBooking = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/reservar/daycare/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!daycare) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-stone-600">Guardería no encontrada</p>
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
            {daycare.gallery_images && daycare.gallery_images.length > 0 && (
              <div className="aspect-video rounded-3xl overflow-hidden">
                <img
                  src={daycare.gallery_images[0]}
                  alt={daycare.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <Card className="rounded-3xl border-stone-200" data-testid="daycare-profile-card">
              <CardContent className="p-8">
                <div className="mb-6">
                  <h1 className="text-3xl font-heading font-bold text-stone-900 mb-3">{daycare.name}</h1>
                  <div className="flex items-center gap-2 text-stone-600 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{daycare.location}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {daycare.verified && (
                      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 rounded-full" data-testid="verified-badge">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verificado
                      </Badge>
                    )}
                    {daycare.insured && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-full" data-testid="insured-badge">
                        <Shield className="w-3 h-3 mr-1" />
                        Asegurado
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <span className="text-lg font-bold text-stone-900">{daycare.rating}</span>
                      <span className="text-stone-500">({daycare.reviews_count} reseñas)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-stone-900 mb-2">Descripción</h2>
                    <p className="text-stone-600 leading-relaxed">{daycare.description}</p>
                  </div>

                  <div>
                    <h2 className="text-xl font-heading font-bold text-stone-900 mb-3">Amenidades</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {daycare.has_cameras && (
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                          <Camera className="w-5 h-5 text-purple-600" />
                          <span className="text-stone-700">Cámaras 24/7</span>
                        </div>
                      )}
                      {daycare.has_green_areas && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                          <Leaf className="w-5 h-5 text-green-600" />
                          <span className="text-stone-700">Zonas Verdes</span>
                        </div>
                      )}
                      {daycare.has_transportation && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                          <Truck className="w-5 h-5 text-blue-600" />
                          <span className="text-stone-700">Transporte Disponible</span>
                        </div>
                      )}
                      {daycare.amenities && daycare.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-stone-100 rounded-xl">
                          <CheckCircle2 className="w-5 h-5 text-stone-600" />
                          <span className="text-stone-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {daycare.gallery_images && daycare.gallery_images.length > 1 && (
              <Card className="rounded-3xl border-stone-200">
                <CardContent className="p-8">
                  <h2 className="text-xl font-heading font-bold text-stone-900 mb-4">Tour Virtual</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {daycare.gallery_images.slice(1).map((img, index) => (
                      <div key={index} className="aspect-square rounded-2xl overflow-hidden">
                        <img src={img} alt={`Tour ${index + 1}`} className="w-full h-full object-cover" />
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
                    ${daycare.price_per_day.toLocaleString()}
                  </div>
                  <div className="text-stone-500">por día</div>
                </div>

                <Button
                  onClick={handleBooking}
                  className="w-full h-14 bg-emerald-400 text-white hover:bg-emerald-500 rounded-full text-lg font-semibold shadow-lg shadow-emerald-100 mb-4"
                  data-testid="book-daycare-btn"
                >
                  Reservar Estadía
                </Button>

                <div className="space-y-3 pt-6 border-t border-stone-200">
                  <div className="flex items-center gap-3 text-stone-600">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Seguro incluido</span>
                  </div>
                  {daycare.has_cameras && (
                    <div className="flex items-center gap-3 text-stone-600">
                      <Camera className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm">Acceso a cámaras 24/7</span>
                    </div>
                  )}
                  {daycare.has_green_areas && (
                    <div className="flex items-center gap-3 text-stone-600">
                      <Leaf className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm">Espacios al aire libre</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DaycareProfile;