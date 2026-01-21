import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const AMENITIES_OPTIONS = [
    "Cámaras de seguridad", "Transporte", "Zonas verdes", "Piscina",
    "Aire acondicionado", "Juegos interactivos", "Entrenamiento básico", "Spa/Grooming"
];

const SPECIALTIES_OPTIONS = [
    "Medicina General", "Cirugía", "Dermatología", "Odontología",
    "Oftalmología", "Fisioterapia", "Comportamiento", "Urgencias"
];

const LocationMarker = ({ position, setPosition, setLocationName }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            fetchLocationName(e.latlng.lat, e.latlng.lng, setLocationName);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
};

const fetchLocationName = async (lat, lng, setLocationName) => {
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        if (response.data && response.data.display_name) {
            // Simplify address
            const parts = response.data.display_name.split(',');
            const simpleAddress = parts.slice(0, 3).join(',');
            setLocationName(simpleAddress);
        }
    } catch (error) {
        console.error("Error fetching location name", error);
    }
};

const CreateProfile = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form States
    const [bio, setBio] = useState('');
    const [price, setPrice] = useState('');
    const [experienceYears, setExperienceYears] = useState(0);
    const [professionalLicense, setProfessionalLicense] = useState('');

    // Location State
    const [locationName, setLocationName] = useState('Bogotá, Colombia');
    const [position, setPosition] = useState({ lat: 4.6097, lng: -74.0817 });

    // Multi-select States
    const [amenities, setAmenities] = useState([]);
    const [specialties, setSpecialties] = useState([]);

    // License Image (for vets)
    const [licenseImageUrl, setLicenseImageUrl] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role === 'owner') {
            navigate('/dashboard');
        }
        // Try to get initial location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            }, (err) => {
                console.log("Location access denied or error", err);
            });
        }
    }, [user, navigate]);

    const handleCheckboxChange = (checked, item, list, setList) => {
        if (checked) {
            setList([...list, item]);
        } else {
            setList(list.filter((i) => i !== item));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let endpoint = '';
            let payload = {};

            if (user.role === 'walker') {
                endpoint = '/walkers';
                payload = {
                    bio,
                    experience_years: parseInt(experienceYears),
                    price_per_walk: parseFloat(price),
                    location_name: locationName,
                    latitude: position.lat,
                    longitude: position.lng,
                    certifications: []
                };
            } else if (user.role === 'daycare') {
                endpoint = '/daycares';
                payload = {
                    name: user.name + ' Daycare',
                    description: bio || "Sin descripción",
                    price_per_day: parseFloat(price),
                    location_name: locationName,
                    latitude: position.lat,
                    longitude: position.lng,
                    amenities: amenities
                };
            } else if (user.role === 'vet') {
                if (!licenseImageUrl) {
                    toast.error('Por favor sube una imagen de tu Tarjeta Profesional');
                    setLoading(false);
                    return;
                }
                endpoint = '/vets';
                payload = {
                    professional_license: professionalLicense,
                    license_image_url: licenseImageUrl,
                    specialties: specialties.length > 0 ? specialties : ['General'],
                    bio,
                    experience_years: parseInt(experienceYears),
                    location_name: locationName,
                    latitude: position.lat,
                    longitude: position.lng,
                    rates: { consultation: parseFloat(price) }
                };
            }

            await axios.post(`${API}${endpoint}`, payload);
            toast.success('Perfil creado exitosamente');
            navigate('/provider-dashboard');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.detail || 'Error al crear perfil');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 py-8">
            <Card className="w-full max-w-2xl rounded-3xl border-stone-200 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">
                        Configurar Perfil de {user.role === 'walker' ? 'Paseador' : user.role === 'daycare' ? 'Guardería' : 'Veterinario'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="space-y-2">
                            <Label>Biografía / Descripción</Label>
                            <Textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Cuéntanos sobre los servicios que ofreces..."
                                required={user.role !== 'daycare'}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Precio Base ({user.role === 'walker' ? 'Paseo' : user.role === 'daycare' ? 'Día' : 'Consulta'})</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-stone-500">$</span>
                                    <Input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="pl-7"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                            </div>

                            {(user.role === 'walker' || user.role === 'vet') && (
                                <div className="space-y-2">
                                    <Label>Años de Experiencia</Label>
                                    <Input
                                        type="number"
                                        value={experienceYears}
                                        onChange={(e) => setExperienceYears(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                        </div>

                        {user.role === 'daycare' && (
                            <div className="space-y-3">
                                <Label>Amenidades Disponibles</Label>
                                <div className="grid grid-cols-2 gap-2 border rounded-xl p-4 bg-stone-50">
                                    {AMENITIES_OPTIONS.map((item) => (
                                        <div key={item} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`amenity-${item}`}
                                                checked={amenities.includes(item)}
                                                onCheckedChange={(checked) => handleCheckboxChange(checked, item, amenities, setAmenities)}
                                            />
                                            <label
                                                htmlFor={`amenity-${item}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {item}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {user.role === 'vet' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Tarjeta Profesional (Licencia)</Label>
                                    <Input
                                        value={professionalLicense}
                                        onChange={(e) => setProfessionalLicense(e.target.value)}
                                        placeholder="Ej: TP-12345"
                                        required
                                    />
                                </div>
                                <ImageUpload
                                    folder="licenses"
                                    label="Foto de Tarjeta Profesional"
                                    required={true}
                                    onUploadComplete={(url) => setLicenseImageUrl(url)}
                                    currentImage={licenseImageUrl}
                                />
                                <div className="space-y-3">
                                    <Label>Especialidades</Label>
                                    <div className="grid grid-cols-2 gap-2 border rounded-xl p-4 bg-stone-50">
                                        {SPECIALTIES_OPTIONS.map((item) => (
                                            <div key={item} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`spec-${item}`}
                                                    checked={specialties.includes(item)}
                                                    onCheckedChange={(checked) => handleCheckboxChange(checked, item, specialties, setSpecialties)}
                                                />
                                                <label
                                                    htmlFor={`spec-${item}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {item}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Ubicación: {locationName}</Label>
                            <p className="text-xs text-stone-500 mb-2">Haz clic en el mapa para ajustar tu ubicación exacta.</p>
                            <div className="h-[250px] w-full rounded-xl overflow-hidden border border-stone-200 z-0">
                                <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <LocationMarker
                                        position={position}
                                        setPosition={setPosition}
                                        setLocationName={setLocationName}
                                    />
                                </MapContainer>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-[#78C494] hover:bg-[#28B463] text-white h-12 text-lg rounded-xl" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Guardar y Continuar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateProfile;
