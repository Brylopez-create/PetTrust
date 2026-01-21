import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Shield, AlertTriangle, Share2, Users, Phone, Copy, CheckCircle, Clock } from 'lucide-react';

const SafetyCenter = ({ bookingId, onClose }) => {
  const { user } = useContext(AuthContext);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });
  const [showAddContact, setShowAddContact] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [pin, setPin] = useState(null);
  const [verifyPin, setVerifyPin] = useState('');
  const [safetyStatus, setSafetyStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmergencyContacts();
    if (bookingId) {
      fetchSafetyStatus();
    }
  }, [bookingId]);

  const fetchEmergencyContacts = async () => {
    try {
      const response = await axios.get(`${API}/emergency-contacts`);
      setEmergencyContacts(response.data);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
    }
  };

  const fetchSafetyStatus = async () => {
    try {
      const response = await axios.get(`${API}/bookings/${bookingId}/safety-status`);
      setSafetyStatus(response.data);
    } catch (error) {
      console.error('Error fetching safety status:', error);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/emergency-contacts`, newContact);
      toast.success('Contacto de emergencia agregado');
      setNewContact({ name: '', phone: '', relationship: '' });
      setShowAddContact(false);
      fetchEmergencyContacts();
    } catch (error) {
      toast.error('Error al agregar contacto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await axios.delete(`${API}/emergency-contacts/${contactId}`);
      toast.success('Contacto eliminado');
      fetchEmergencyContacts();
    } catch (error) {
      toast.error('Error al eliminar contacto');
    }
  };

  const handleShareTrip = async () => {
    if (!bookingId) {
      toast.error('No hay reserva activa para compartir');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/bookings/${bookingId}/share-trip`);
      setShareLink(response.data);
      toast.success('Link de seguimiento generado');
    } catch (error) {
      toast.error('Error al generar link');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePin = async () => {
    if (!bookingId) {
      toast.error('No hay reserva activa');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/bookings/${bookingId}/generate-pin`);
      setPin(response.data.pin_code);
      toast.success('PIN generado. Compártelo con el paseador.');
    } catch (error) {
      toast.error('Error al generar PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (!verifyPin || verifyPin.length !== 4) {
      toast.error('Ingresa un PIN de 4 dígitos');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/bookings/${bookingId}/verify-pin?pin_code=${verifyPin}`);
      toast.success('PIN verificado correctamente');
      setVerifyPin('');
      fetchSafetyStatus();
    } catch (error) {
      toast.error('PIN inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = async () => {
    if (!bookingId) {
      toast.error('No hay reserva activa');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocalización no disponible');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await axios.post(`${API}/sos`, null, {
            params: {
              booking_id: bookingId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
          
          toast.error(
            `🚨 ALERTA SOS ACTIVADA\nContactos notificados\nPolicia: ${response.data.emergency_number}`,
            { duration: 10000 }
          );
        } catch (error) {
          toast.error('Error al activar SOS');
        }
      },
      () => {
        toast.error('No se pudo obtener ubicación');
      }
    );
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold text-stone-900">Centro de Seguridad</h2>
          <p className="text-stone-600 text-sm">Tu seguridad es nuestra prioridad</p>
        </div>
      </div>

      {safetyStatus && (
        <Card className="rounded-2xl border-stone-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-stone-900">Estado de Seguridad</span>
              <Badge 
                className={
                  safetyStatus.safety_score === 'high' ? 'bg-emerald-100 text-emerald-700' :
                  safetyStatus.safety_score === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }
              >
                {safetyStatus.safety_score === 'high' ? 'Seguro' : 
                 safetyStatus.safety_score === 'medium' ? 'Normal' : 'Alerta'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className={safetyStatus.pin_verified ? 'w-4 h-4 text-[#28B463]' : 'w-4 h-4 text-stone-300'} />
                <span>PIN Verificado</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <span>{safetyStatus.check_ins_count} Check-ins</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-red-200 bg-red-50">
        <CardContent className="p-6">
          <Button
            onClick={handleSOS}
            className="w-full h-16 bg-red-500 text-white hover:bg-red-600 rounded-xl text-lg font-bold shadow-lg"
            data-testid="sos-button"
          >
            <AlertTriangle className="w-6 h-6 mr-2" />
            🚨 EMERGENCIA SOS
          </Button>
          <p className="text-xs text-stone-600 text-center mt-2">
            Presiona solo en caso de emergencia real
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-stone-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Share2 className="w-5 h-5 text-[#28B463]" />
            <span className="font-semibold text-stone-900">Compartir Paseo</span>
          </div>
          
          {!shareLink ? (
            <Button
              onClick={handleShareTrip}
              disabled={loading || !bookingId}
              className="w-full bg-[#28B463] text-white hover:bg-[#78C494] rounded-xl"
            >
              Generar Link de Seguimiento
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-stone-100 p-4 rounded-xl break-all">
                <p className="text-xs text-stone-600 mb-1">Link:</p>
                <p className="text-sm font-mono">{shareLink.share_url}</p>
              </div>
              <Button
                onClick={() => copyToClipboard(shareLink.share_url)}
                variant="outline"
                className="w-full rounded-xl"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-stone-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-stone-900">Verificación PIN</span>
          </div>
          
          {user?.role === 'owner' ? (
            <div className="space-y-3">
              {!pin ? (
                <Button
                  onClick={handleGeneratePin}
                  disabled={loading || !bookingId}
                  className="w-full bg-purple-400 text-white hover:bg-purple-500 rounded-xl"
                >
                  Generar PIN de Seguridad
                </Button>
              ) : (
                <div className="bg-purple-50 p-6 rounded-xl text-center">
                  <p className="text-sm text-stone-600 mb-2">Tu PIN:</p>
                  <p className="text-4xl font-bold text-purple-600 tracking-widest">{pin}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Ingresa el PIN del dueño</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  maxLength={4}
                  value={verifyPin}
                  onChange={(e) => setVerifyPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="text-2xl text-center tracking-widest h-14 rounded-xl"
                />
                <Button
                  onClick={handleVerifyPin}
                  disabled={loading || verifyPin.length !== 4}
                  className="bg-purple-400 text-white hover:bg-purple-500 rounded-xl px-6"
                >
                  Verificar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-stone-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-sky-600" />
              <span className="font-semibold text-stone-900">Contactos de Emergencia</span>
            </div>
            <Button
              onClick={() => setShowAddContact(!showAddContact)}
              size="sm"
              variant="ghost"
              className="text-[#28B463]"
            >
              + Agregar
            </Button>
          </div>

          {showAddContact && (
            <form onSubmit={handleAddContact} className="space-y-3 mb-4 p-4 bg-stone-50 rounded-xl">
              <Input
                placeholder="Nombre"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                required
              />
              <Input
                placeholder="Teléfono (ej: +57 300 123 4567)"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                required
              />
              <Input
                placeholder="Relación (ej: Hermana, Amigo)"
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-400 text-white hover:bg-sky-500 rounded-xl"
              >
                Guardar Contacto
              </Button>
            </form>
          )}

          {emergencyContacts.length === 0 ? (
            <p className="text-stone-500 text-sm text-center py-4">
              No tienes contactos de emergencia
            </p>
          ) : (
            <div className="space-y-2">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-stone-500" />
                    <div>
                      <p className="font-semibold text-sm text-stone-900">{contact.name}</p>
                      <p className="text-xs text-stone-500">{contact.relationship} • {contact.phone}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDeleteContact(contact.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {onClose && (
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full rounded-xl"
        >
          Cerrar
        </Button>
      )}
    </div>
  );
};

export default SafetyCenter;
