import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea'; // Assuming it exists, or use Input
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';

const CreateProfile = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        bio: '',
        location_name: 'Bogotá, Colombia',
        latitude: 4.6097,
        longitude: -74.0817,
        price: '',
        experience_years: 0,
        // Daycare specific default
        amenities: '',
        // Vet specific default
        professional_license: '',
        specialties: ''
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (user.role === 'owner') {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleLocationClick = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData({
                        ...formData,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    toast.success('Ubicación obtenida');
                },
                (error) => {
                    toast.error('Error al obtener ubicación');
                }
            );
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
                    bio: formData.bio,
                    experience_years: parseInt(formData.experience_years),
                    price_per_walk: parseFloat(formData.price),
                    location_name: formData.location_name,
                    latitude: parseFloat(formData.latitude),
                    longitude: parseFloat(formData.longitude),
                    certifications: []
                };
            } else if (user.role === 'daycare') {
                endpoint = '/daycares';
                payload = {
                    name: user.name + ' Daycare', // Default name
                    description: formData.bio,
                    price_per_day: parseFloat(formData.price),
                    location_name: formData.location_name,
                    latitude: parseFloat(formData.latitude),
                    longitude: parseFloat(formData.longitude),
                    amenities: formData.amenities ? formData.amenities.split(',').map(s => s.trim()) : []
                };
                // Add required fields check
                if (!payload.description) payload.description = "Sin descripción";
            } else if (user.role === 'vet') {
                endpoint = '/vets';
                payload = {
                    professional_license: formData.professional_license,
                    specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()) : ['General'],
                    bio: formData.bio,
                    experience_years: parseInt(formData.experience_years),
                    location_name: formData.location_name,
                    latitude: parseFloat(formData.latitude),
                    longitude: parseFloat(formData.longitude),
                    rates: { consultation: parseFloat(formData.price) }
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
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg rounded-3xl border-stone-200 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">
                        Configurar Perfil de {user.role === 'walker' ? 'Paseador' : user.role === 'daycare' ? 'Guardería' : 'Veterinario'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div>
                            <Label>Biografía / Descripción</Label>
                            <Input
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                placeholder="Cuéntanos sobre ti..."
                                required={user.role !== 'daycare'} // Daycare uses bio as description
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Precio ({user.role === 'walker' ? 'Paseo' : user.role === 'daycare' ? 'Día' : 'Consulta'})</Label>
                                <Input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label>Años Experiencia</Label>
                                <Input
                                    type="number"
                                    value={formData.experience_years}
                                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                                    required={user.role !== 'daycare'}
                                />
                            </div>
                        </div>

                        {user.role === 'daycare' && (
                            <div>
                                <Label>Amenidades (separadas por coma)</Label>
                                <Input
                                    value={formData.amenities}
                                    onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                                    placeholder="Cámaras, Transporte, Patio..."
                                />
                            </div>
                        )}

                        {user.role === 'vet' && (
                            <>
                                <div>
                                    <Label>Tarjeta Profesional</Label>
                                    <Input
                                        value={formData.professional_license}
                                        onChange={(e) => setFormData({ ...formData, professional_license: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Especialidades (separadas por coma)</Label>
                                    <Input
                                        value={formData.specialties}
                                        onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                                        placeholder="General, Cirugía, Dermatología"
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label>Ubicación (Coordenadas)</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.latitude}
                                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                    placeholder="Latitud"
                                />
                                <Input
                                    value={formData.longitude}
                                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                    placeholder="Longitud"
                                />
                                <Button type="button" onClick={handleLocationClick} variant="outline" size="icon">
                                    <MapPin className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Guardar Perfil'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateProfile;
