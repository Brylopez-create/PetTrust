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
import { Star, MapPin, Shield, CheckCircle2, Stethoscope, Home, MessageCircle, FileText } from 'lucide-react';
import ChatCenter from '../components/ChatCenter';

const VetProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [vet, setVet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        fetchVet();
    }, [id]);

    const fetchVet = async () => {
        try {
            const response = await axios.get(`${API}/vets/${id}`);
            setVet(response.data);
        } catch (error) {
            console.error('Error fetching vet:', error);
        } finally {
            setLoading(false);
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
                provider_type: 'vet'
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
        navigate(`/reservar/vet/${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent"></div>
            </div>
        );
    }

    if (!vet) {
        return (
            <div className="min-h-screen bg-stone-50">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-12 text-center">
                    <p className="text-stone-600">Veterinario no encontrado</p>
                </div>
            </div>
        );
    }

    const consultationPrice = vet.rates ? vet.rates.consultation : 0;

    return (
        <div className="min-h-screen bg-stone-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="rounded-3xl border-stone-200">
                            <CardContent className="p-8">
                                <div className="flex flex-col md:flex-row gap-6 mb-6">
                                    <Avatar className="w-32 h-32 rounded-2xl">
                                        <AvatarImage src={vet.profile_image} alt={vet.name} />
                                        <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-100 to-stone-100 rounded-2xl">
                                            {vet.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h1 className="text-3xl font-heading font-bold text-stone-900 mb-2">{vet.name}</h1>
                                                <div className="flex items-center gap-2 text-stone-600 mb-2">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{vet.location_name}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {vet.verified && (
                                                <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Verificado
                                                </Badge>
                                            )}

                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 rounded-full">
                                                <Stethoscope className="w-3 h-3 mr-1" />
                                                {vet.experience_years} años de experiencia
                                            </Badge>

                                            {vet.home_visit_available && (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-full">
                                                    <Home className="w-3 h-3 mr-1" />
                                                    Visita Domiciliaria
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h2 className="text-xl font-heading font-bold text-stone-900 mb-2">Perfil Profesional</h2>
                                        <p className="text-stone-600 leading-relaxed">{vet.bio}</p>
                                    </div>

                                    {vet.specialties && vet.specialties.length > 0 && (
                                        <div>
                                            <h2 className="text-xl font-heading font-bold text-stone-900 mb-3">Especialidades</h2>
                                            <div className="flex flex-wrap gap-2">
                                                {vet.specialties.map((spec, index) => (
                                                    <Badge key={index} className="bg-purple-100 text-purple-700 hover:bg-purple-100 rounded-full">
                                                        {spec}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {vet.professional_license && (
                                        <div className="flex items-center gap-2 text-stone-500 mt-4 p-3 bg-stone-50 rounded-xl">
                                            <FileText className="w-5 h-5" />
                                            <span className="text-sm">Licencia Profesional: {vet.professional_license}</span>
                                        </div>
                                    )}

                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    <div className="lg:col-span-1">
                        <Card className="rounded-3xl border-stone-200 sticky top-24">
                            <CardContent className="p-8">
                                <div className="text-center mb-6">
                                    {consultationPrice > 0 ? (
                                        <>
                                            <div className="text-4xl font-heading font-bold text-stone-900 mb-2">
                                                ${consultationPrice.toLocaleString()}
                                            </div>
                                            <div className="text-stone-500">Consulta</div>
                                        </>
                                    ) : (
                                        <div className="text-xl font-bold text-stone-900 mb-2">Tarifas a convenir</div>
                                    )}
                                </div>

                                <Button
                                    onClick={handleBooking}
                                    className="w-full h-14 bg-emerald-400 text-white hover:bg-emerald-500 rounded-full text-lg font-semibold shadow-lg shadow-emerald-100 mb-3"
                                >
                                    Agendar Cita
                                </Button>

                                <Button
                                    onClick={handleStartChat}
                                    variant="outline"
                                    className="w-full h-12 rounded-full border-stone-200 hover:bg-stone-50 mb-4"
                                >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Consultar Disponibilidad
                                </Button>

                                <div className="space-y-3 pt-6 border-t border-stone-200">
                                    <div className="flex items-center gap-3 text-stone-600">
                                        <Shield className="w-5 h-5 text-emerald-400" />
                                        <span className="text-sm">Profesional Verificado</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <ChatCenter isOpen={showChat} onClose={() => setShowChat(false)} />
        </div>
    );
};

export default VetProfile;
