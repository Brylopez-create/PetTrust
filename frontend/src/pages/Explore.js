import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import Navbar from '../components/Navbar';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Star, MapPin, Shield, CheckCircle2 } from 'lucide-react';

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [walkers, setWalkers] = useState([]);
  const [daycares, setDaycares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('walkers');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');

  useEffect(() => {
    fetchData();
  }, [locationFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const walkersRes = await axios.get(`${API}/walkers${locationFilter ? `?location=${locationFilter}` : ''}`);
      const daycaresRes = await axios.get(`${API}/daycares${locationFilter ? `?location=${locationFilter}` : ''}`);
      setWalkers(walkersRes.data);
      setDaycares(daycaresRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const locations = ['Usaquén', 'Chapinero', 'Colina Campestre', 'Cedritos', 'La Calera', 'Chía'];

  const WalkerCard = ({ walker }) => (
    <Card
      className="rounded-3xl border-stone-100 hover:shadow-lg transition-all cursor-pointer card-hover"
      onClick={() => navigate(`/paseadores/${walker.id}`)}
      data-testid={`walker-card-${walker.id}`}
    >
      <CardContent className="p-0">
        <div className="aspect-square bg-gradient-to-br from-emerald-100 to-stone-100 rounded-t-3xl overflow-hidden">
          {walker.profile_image ? (
            <img src={walker.profile_image} alt={walker.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">👤</div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-heading font-bold text-xl text-stone-900 mb-1">{walker.name}</h3>
              <div className="flex items-center gap-1 text-sm text-stone-600">
                <MapPin className="w-4 h-4" />
                {walker.location}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-amber-700">{walker.rating}</span>
            </div>
          </div>

          <p className="text-stone-600 text-sm mb-4 line-clamp-2">{walker.bio}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {walker.verified && (
              <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 rounded-full text-xs" data-testid="verified-badge">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Verificado
              </Badge>
            )}
            {walker.insured && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-full text-xs" data-testid="insured-badge">
                <Shield className="w-3 h-3 mr-1" />
                Asegurado
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <div>
              <span className="text-2xl font-heading font-bold text-stone-900">${walker.price_per_walk.toLocaleString()}</span>
              <span className="text-stone-500 text-sm">/paseo</span>
            </div>
            <Button
              className="bg-emerald-400 text-white hover:bg-emerald-500 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/paseadores/${walker.id}`);
              }}
              data-testid={`view-walker-btn-${walker.id}`}
            >
              Ver Perfil
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const DaycareCard = ({ daycare }) => (
    <Card
      className="rounded-3xl border-stone-100 hover:shadow-lg transition-all cursor-pointer card-hover"
      onClick={() => navigate(`/guarderias/${daycare.id}`)}
      data-testid={`daycare-card-${daycare.id}`}
    >
      <CardContent className="p-0">
        <div className="aspect-video bg-gradient-to-br from-emerald-100 to-stone-100 rounded-t-3xl overflow-hidden">
          {daycare.gallery_images && daycare.gallery_images.length > 0 ? (
            <img src={daycare.gallery_images[0]} alt={daycare.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🏠</div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-heading font-bold text-xl text-stone-900 mb-1">{daycare.name}</h3>
              <div className="flex items-center gap-1 text-sm text-stone-600">
                <MapPin className="w-4 h-4" />
                {daycare.location}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-amber-700">{daycare.rating}</span>
            </div>
          </div>

          <p className="text-stone-600 text-sm mb-4 line-clamp-2">{daycare.description}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {daycare.has_cameras && (
              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 rounded-full text-xs">
                📹 Cámaras 24/7
              </Badge>
            )}
            {daycare.has_green_areas && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-full text-xs">
                🌳 Zonas Verdes
              </Badge>
            )}
            {daycare.has_transportation && (
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 rounded-full text-xs">
                🚗 Transporte
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <div>
              <span className="text-2xl font-heading font-bold text-stone-900">${daycare.price_per_day.toLocaleString()}</span>
              <span className="text-stone-500 text-sm">/día</span>
            </div>
            <Button
              className="bg-emerald-400 text-white hover:bg-emerald-500 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/guarderias/${daycare.id}`);
              }}
              data-testid={`view-daycare-btn-${daycare.id}`}
            >
              Ver Perfil
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-stone-900 mb-4">
            Explorar Servicios
          </h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={locationFilter || "all"} onValueChange={(val) => setLocationFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full sm:w-64 rounded-xl" data-testid="location-filter">
                <SelectValue placeholder="Filtrar por localidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las localidades</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8" data-testid="service-tabs">
            <TabsTrigger value="walkers" data-testid="walkers-tab">Paseadores ({walkers.length})</TabsTrigger>
            <TabsTrigger value="daycares" data-testid="daycares-tab">Guarderías ({daycares.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="walkers">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent mx-auto"></div>
              </div>
            ) : walkers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-600">No se encontraron paseadores en esta ubicación</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="walkers-grid">
                {walkers.map(walker => <WalkerCard key={walker.id} walker={walker} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="daycares">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent mx-auto"></div>
              </div>
            ) : daycares.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-600">No se encontraron guarderías en esta ubicación</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="daycares-grid">
                {daycares.map(daycare => <DaycareCard key={daycare.id} daycare={daycare} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Explore;