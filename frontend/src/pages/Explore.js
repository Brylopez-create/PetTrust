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
import { Input } from '../components/ui/input';
import { Star, MapPin, Shield, CheckCircle2, Stethoscope, Home, Sparkles, Clock, Target } from 'lucide-react';
import MatchBadge from '../components/MatchBadge';
import MatchLoading from '../components/MatchLoading';
import { toast } from 'sonner';

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [walkers, setWalkers] = useState([]);
  const [daycares, setDaycares] = useState([]);
  const [vets, setVets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('walkers');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');
  const [matchingResults, setMatchingResults] = useState([]);
  const [isMatching, setIsMatching] = useState(false);
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState('');
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTime, setSearchTime] = useState('10:00');

  useEffect(() => {
    fetchData();
    fetchPets();
  }, [locationFilter]);

  const fetchPets = async () => {
    try {
      const response = await axios.get(`${API}/pets`);
      setPets(response.data);
      if (response.data.length > 0) setSelectedPet(response.data[0].id);
    } catch (error) {
      console.error('Error fetching pets:', error);
    }
  };

  const startPetMatch = async () => {
    if (!selectedPet) {
      toast.error('Debes seleccionar una mascota para el algoritmo PetMatch');
      return;
    }

    setIsMatching(true);
    // Simular tiempo de "Análisis profundo" para mejorar percepción de valor
    await new Promise(r => setTimeout(r, 3500));

    try {
      const res = await axios.post(`${API}/v1/petmatch`, {
        pet_id: selectedPet,
        lat: 4.6097, // Mock coords para Bogotá Centro si no hay browser geo
        lng: -74.0817,
        date: searchDate,
        time: searchTime
      });
      setMatchingResults(res.data);
      toast.success('¡PetMatch ha encontrado los mejores paseadores para ti!');
    } catch (error) {
      console.error('Error in PetMatch:', error);
      toast.error('Error al ejecutar el algoritmo de matching');
    } finally {
      setIsMatching(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = locationFilter ? `?location=${locationFilter}` : '';
      const [walkersRes, daycaresRes, vetsRes] = await Promise.all([
        axios.get(`${API}/walkers${query}`),
        axios.get(`${API}/daycares${query}`),
        axios.get(`${API}/vets${query}`)
      ]);

      setWalkers(walkersRes.data);
      setDaycares(daycaresRes.data);
      setVets(vetsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const locations = ['Usaquén', 'Chapinero', 'Colina Campestre', 'Cedritos', 'La Calera', 'Chía'];

  const WalkerCard = ({ walker }) => (
    <Card
      className="rounded-2xl border-stone-100 hover:shadow-lg transition-all cursor-pointer card-hover overflow-hidden h-full"
      onClick={() => navigate(`/paseadores/${walker.id}`)}
      data-testid={`walker-card-${walker.id}`}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Mobile: Horizontal Layout optimized */}
        <div className="flex sm:block h-full">
          {/* Image Side */}
          <div className="w-1/3 sm:w-full aspect-[4/5] sm:aspect-square bg-stone-100 relative shrink-0">
            {walker.profile_image ? (
              <img src={walker.profile_image} alt={walker.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl bg-gradient-to-br from-emerald-50 to-emerald-100/50">👤</div>
            )}
            {/* Rating Badge Overlay for Mobile */}
            <div className="absolute top-2 left-2 sm:hidden flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg shadow-sm">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-stone-900">{walker.rating}</span>
            </div>
          </div>

          {/* Content Side */}
          <div className="w-2/3 sm:w-full p-3 sm:p-5 flex flex-col justify-between relative">
            {walker.match_score && (
              <div className="absolute top-3 right-3 z-10 scale-90 sm:scale-100">
                <MatchBadge score={walker.match_score} />
              </div>
            )}
            <div>
              <div className="flex items-start justify-between mb-1 sm:mb-2">
                <div>
                  <h3 className="font-heading font-bold text-lg sm:text-xl text-stone-900 leading-tight">{walker.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{walker.location_name}</span>
                  </div>
                </div>
                {/* Desktop Rating */}
                <div className="hidden sm:flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-700">{walker.rating}</span>
                </div>
              </div>

              <p className="text-stone-600 text-xs sm:text-sm mb-3 line-clamp-2 leading-relaxed">{walker.bio}</p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {walker.verified && (
                  <Badge className="bg-sky-50 text-sky-700 border-0 px-1.5 py-0.5 text-[10px] sm:text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verificado
                  </Badge>
                )}
                {walker.insured && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-0 px-1.5 py-0.5 text-[10px] sm:text-xs hidden min-[370px]:inline-flex">
                    <Shield className="w-3 h-3 mr-1" />
                    Asegurado
                  </Badge>
                )}
                {walker.verification_status === 'pending' && (
                  <Badge className="bg-amber-50 text-amber-700 border-0 px-1.5 py-0.5 text-[10px]">
                    ⏳ Pendiente
                  </Badge>
                )}
              </div>

              {walker.distance_km !== undefined && (
                <div className="flex items-center gap-1.5 text-[#28B463] font-bold text-xs mb-3">
                  <Target className="w-4 h-4" />
                  <span>A {walker.distance_km} km de distancia</span>
                </div>
              )}
            </div>

            <div className="flex items-end justify-between pt-2 sm:pt-4 border-t border-stone-100 mt-auto">
              <div>
                <span className="text-lg sm:text-xl font-heading font-bold text-emerald-600">${walker.price_per_walk?.toLocaleString()}</span>
                <span className="text-stone-400 text-xs ml-1">/paseo</span>
              </div>
              <Button
                size="sm"
                className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full text-xs h-8 px-3 sm:px-4 sm:h-9"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/paseadores/${walker.id}`);
                }}
              >
                Ver
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const DaycareCard = ({ daycare }) => (
    <Card
      className="rounded-2xl border-stone-100 hover:shadow-lg transition-all cursor-pointer card-hover overflow-hidden h-full"
      onClick={() => navigate(`/guarderias/${daycare.id}`)}
      data-testid={`daycare-card-${daycare.id}`}
    >
      <CardContent className="p-0 flex flex-col h-full">
        <div className="flex sm:block h-full">
          {/* Image Side */}
          <div className="w-1/3 sm:w-full aspect-[4/5] sm:aspect-video bg-stone-100 relative shrink-0">
            {daycare.gallery_images && daycare.gallery_images.length > 0 ? (
              <img src={daycare.gallery_images[0]} alt={daycare.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl bg-gradient-to-br from-emerald-50 to-emerald-100/50">🏠</div>
            )}
            <div className="absolute top-2 left-2 sm:hidden flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg shadow-sm">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-stone-900">{daycare.rating}</span>
            </div>
          </div>

          {/* Content Side */}
          <div className="w-2/3 sm:w-full p-3 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-1 sm:mb-2">
                <div>
                  <h3 className="font-heading font-bold text-lg sm:text-xl text-stone-900 leading-tight">{daycare.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{daycare.location_name}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-700">{daycare.rating}</span>
                </div>
              </div>

              <p className="text-stone-600 text-xs sm:text-sm mb-3 line-clamp-2 leading-relaxed">{daycare.description}</p>

              <div className="flex flex-wrap gap-1.5 mb-3 hidden min-[370px]:flex">
                {daycare.has_cameras && (
                  <Badge className="bg-purple-50 text-purple-700 border-0 px-1.5 py-0.5 text-[10px]">📹 Cámaras</Badge>
                )}
                {daycare.has_green_areas && (
                  <Badge className="bg-green-50 text-green-700 border-0 px-1.5 py-0.5 text-[10px]">🌳 Zonas</Badge>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between pt-2 sm:pt-4 border-t border-stone-100 mt-auto">
              <div>
                <span className="text-lg sm:text-xl font-heading font-bold text-emerald-600">${daycare.price_per_day?.toLocaleString()}</span>
                <span className="text-stone-400 text-xs ml-1">/día</span>
              </div>
              <Button
                size="sm"
                className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full text-xs h-8 px-3 sm:px-4 sm:h-9"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/guarderias/${daycare.id}`);
                }}
              >
                Ver
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const VetCard = ({ vet }) => (
    <Card
      className="rounded-2xl border-stone-100 hover:shadow-lg transition-all cursor-pointer card-hover overflow-hidden h-full"
      onClick={() => navigate(`/veterinarios/${vet.id}`)}
      data-testid={`vet-card-${vet.id}`}
    >
      <CardContent className="p-0 flex flex-col h-full">
        <div className="flex sm:block h-full">
          {/* Image Side */}
          <div className="w-1/3 sm:w-full aspect-[4/5] sm:aspect-square bg-stone-100 relative shrink-0">
            {vet.profile_image ? (
              <img src={vet.profile_image} alt={vet.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl bg-gradient-to-br from-blue-50 to-blue-100/50">⚕️</div>
            )}
            <div className="absolute top-2 left-2 sm:hidden flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg shadow-sm">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-stone-900">{vet.rating || "N/A"}</span>
            </div>
          </div>

          {/* Content Side */}
          <div className="w-2/3 sm:w-full p-3 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-1 sm:mb-2">
                <div>
                  <h3 className="font-heading font-bold text-lg sm:text-xl text-stone-900 leading-tight">{vet.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{vet.location_name}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-700">{vet.rating || "N/A"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-2 sm:mb-4 h-6 sm:h-auto overflow-hidden">
                {vet.specialties && vet.specialties.slice(0, 2).map((spec, i) => (
                  <Badge key={i} className="bg-purple-50 text-purple-700 border-0 text-[10px] px-1.5">
                    {spec}
                  </Badge>
                ))}
              </div>

              <p className="text-stone-600 text-xs sm:text-sm mb-3 line-clamp-2 leading-relaxed">{vet.bio}</p>
            </div>

            <div className="flex items-end justify-between pt-2 sm:pt-4 border-t border-stone-100 mt-auto">
              <div>
                <span className="text-lg sm:text-xl font-heading font-bold text-stone-900">
                  {vet.rates?.consultation ? `$${vet.rates.consultation.toLocaleString()}` : "A convenir"}
                </span>
                <span className="text-stone-400 text-xs block">/consulta</span>
              </div>
              <Button
                size="sm"
                className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full text-xs h-8 px-3 sm:px-4 sm:h-9"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/veterinarios/${vet.id}`);
                }}
              >
                Ver
              </Button>
            </div>
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

        {activeTab === 'walkers' && (
          <div className="mb-10 p-6 bg-gradient-to-br from-[#28B463]/5 to-[#0F4C75]/5 rounded-3xl border border-[#28B463]/10 shadow-sm overflow-hidden relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#28B463]/5 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-[#28B463] p-1.5 rounded-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Cerebro PetMatch v1</h3>
                </div>
                <p className="text-sm text-slate-600 max-w-md">Nuestro algoritmo de nivel platino analiza geocerca, compatibilidad de especie y reputación real.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">¿Para quién?</label>
                    <Select value={selectedPet} onValueChange={setSelectedPet}>
                      <SelectTrigger className="h-10 bg-white/50 backdrop-blur-sm rounded-xl">
                        <SelectValue placeholder="Mascota" />
                      </SelectTrigger>
                      <SelectContent>
                        {pets.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        {pets.length === 0 && <SelectItem value="none" disabled>No tienes mascotas</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">¿Cuándo?</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        type="date"
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                        className="h-10 pl-9 bg-white/50 backdrop-blur-sm rounded-xl border-stone-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Horario</label>
                    <Select value={searchTime} onValueChange={setSearchTime}>
                      <SelectTrigger className="h-10 bg-white/50 backdrop-blur-sm rounded-xl">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent>
                        {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                onClick={startPetMatch}
                disabled={isMatching || pets.length === 0}
                className="bg-[#28B463] text-white hover:bg-[#1E8449] h-12 px-8 rounded-2xl shadow-lg shadow-emerald-200 flex items-center gap-2 group"
              >
                {isMatching ? 'Puntuando...' : 'Encontrar mi Par'}
                <Sparkles className={`w-4 h-4 ${isMatching ? 'animate-spin' : 'group-hover:scale-125 transition-transform'}`} />
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8 h-12 bg-stone-100 p-1 rounded-2xl">
            <TabsTrigger className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm" value="walkers" data-testid="walkers-tab">Paseadores ({walkers.length})</TabsTrigger>
            <TabsTrigger className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm" value="daycares" data-testid="daycares-tab">Guarderías ({daycares.length})</TabsTrigger>
            <TabsTrigger className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm" value="vets" data-testid="vets-tab">Veterinarios ({vets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="walkers">
            {isMatching ? (
              <MatchLoading />
            ) : loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#28B463]-400 border-t-transparent mx-auto"></div>
              </div>
            ) : matchingResults.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#28B463]" />
                    Mejores Coincidencias para Ti
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setMatchingResults([])} className="text-stone-400">Ver todos los paseadores</Button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matchingResults.map(res => <WalkerCard key={res.walker.id} walker={{ ...res.walker, match_score: res.match_score, distance_km: res.distance_km }} />)}
                </div>
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
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#28B463]-400 border-t-transparent mx-auto"></div>
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

          <TabsContent value="vets">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#28B463]-400 border-t-transparent mx-auto"></div>
              </div>
            ) : vets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-600">No se encontraron veterinarios en esta ubicación</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="vets-grid">
                {vets.map(vet => <VetCard key={vet.id} vet={vet} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Explore;
