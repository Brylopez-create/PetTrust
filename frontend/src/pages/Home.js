import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Search, Shield, MapPin, Heart, Star, CheckCircle2, Camera, Clock } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/explorar?location=${searchLocation}`);
  };

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Cuidadores Verificados',
      description: 'Todos nuestros cuidadores pasan verificación de antecedentes y entrevistas personales'
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'GPS en Tiempo Real',
      description: 'Sigue el paseo de tu mascota en vivo desde tu celular'
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Reporte de Bienestar',
      description: 'Recibe un checklist completo después de cada servicio'
    },
    {
      icon: <Camera className="w-6 h-6" />,
      title: 'Seguro Incluido',
      description: 'Todas las mascotas están aseguradas durante el servicio'
    }
  ];

  const testimonials = [
    {
      name: 'María González',
      location: 'Usaquén',
      text: 'Luna está feliz con su paseador. Me encanta ver su ruta en vivo y el reporte que recibo después.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
    },
    {
      name: 'Carlos Ramírez',
      location: 'Chapinero',
      text: 'La guardería es increíble. Max tiene su propio espacio y puedo ver las cámaras cuando quiera.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
    },
    {
      name: 'Andrea Vargas',
      location: 'Colina Campestre',
      text: 'Confío plenamente. El reporte de bienestar me da tranquilidad cuando estoy trabajando.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop'
    }
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <section className="hero-gradient py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-stone-900 mb-6">
              Cuidadores de Confianza para
              <span className="text-emerald-400"> Tu Familia Peluda</span>
            </h1>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-8">
              Paseadores certificados y guarderías premium en Bogotá. Seguro incluido, GPS en tiempo real y reportes de bienestar.
            </p>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex gap-3 bg-white rounded-full p-2 shadow-lg border border-stone-200">
                <div className="flex items-center flex-1 px-4">
                  <Search className="w-5 h-5 text-stone-400 mr-2" />
                  <Input
                    type="text"
                    placeholder="Buscar por localidad (ej: Usaquén, Chapinero)"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                    data-testid="search-location-input"
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-emerald-400 text-white hover:bg-emerald-500 rounded-full px-8 shadow-lg shadow-emerald-100"
                  data-testid="search-submit-btn"
                >
                  Buscar
                </Button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            <div className="text-center">
              <div className="text-3xl font-heading font-bold text-emerald-400">500+</div>
              <div className="text-sm text-stone-600">Cuidadores Certificados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-bold text-emerald-400">10K+</div>
              <div className="text-sm text-stone-600">Paseos Completados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-bold text-emerald-400">4.9</div>
              <div className="text-sm text-stone-600">Calificación Promedio</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-bold text-emerald-400">100%</div>
              <div className="text-sm text-stone-600">Seguro Incluido</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-stone-900 mb-4">
              Por Qué Somos Diferentes
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              No solo paseamos mascotas, cuidamos miembros de tu familia
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="rounded-3xl border-stone-100 hover:shadow-lg transition-shadow" data-testid={`feature-card-${index}`}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-heading font-bold text-lg text-stone-900 mb-2">{feature.title}</h3>
                  <p className="text-stone-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-br from-emerald-50 to-stone-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-stone-900 mb-4">
              Lo Que Dicen Nuestros Clientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="rounded-3xl border-stone-100" data-testid={`testimonial-card-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-stone-900">{testimonial.name}</div>
                      <div className="text-sm text-stone-500">{testimonial.location}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-stone-600 text-sm">{testimonial.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-3xl p-12 text-white">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
              ¿Listo para Dar Tranquilidad a Tu Mascota?
            </h2>
            <p className="text-emerald-50 mb-8 text-lg">
              Únete a miles de familias que confían en nosotros
            </p>
            <Button
              onClick={() => navigate('/explorar')}
              className="bg-white text-emerald-600 hover:bg-stone-50 rounded-full px-8 py-6 text-lg font-semibold shadow-xl"
              data-testid="cta-explore-btn"
            >
              Explorar Cuidadores
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-stone-900 text-stone-300 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl">🐾</span>
            </div>
            <span className="text-xl font-heading font-bold text-white">PetTrust Bogotá</span>
          </div>
          <p className="text-sm mb-4">Cuidado premium para mascotas en Bogotá</p>
          <p className="text-xs text-stone-400">
            © 2025 PetTrust Bogotá. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;