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
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-2 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-stone-900">Centro de Seguridad</h2>
          <p className="text-stone-600 text-xs sm:text-sm">Tu seguridad es nuestra prioridad</p>
        </div>
      </div>

      <Card className="rounded-2xl border-red-200 bg-red-50 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <Button
            onClick={handleSOS}
            className="w-full h-12 sm:h-16 bg-red-500 text-white hover:bg-red-600 rounded-xl text-base sm:text-lg font-bold shadow-md active:scale-95 transition-transform"
            data-testid="sos-button"
          >
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 mr-2 animate-pulse" />
            EMERGENCIA SOS
          </Button>
          <p className="text-[10px] sm:text-xs text-stone-600 text-center mt-2 font-medium">
            Presiona solo en caso de emergencia real
          </p>
        </CardContent>
      </Card>

      {safetyStatus && (
        <Card className="rounded-2xl border-stone-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="font-semibold text-stone-900 text-sm sm:text-base">Estado de Seguridad</span>
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
            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-stone-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="w-4 h-4 text-[#28B463]" />
              <span className="font-semibold text-stone-900 text-sm">Compartir Paseo</span>
            </div>

            {!shareLink ? (
              <Button
                onClick={handleShareTrip}
                disabled={loading || !bookingId}
                size="sm"
                className="w-full bg-[#28B463] text-white hover:bg-[#78C494] rounded-lg text-xs h-9"
              >
                Generar Link
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => copyToClipboard(shareLink.share_url)}
                  variant="outline"
                  size="sm"
                  className="w-full rounded-lg text-xs"
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copiar Link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-stone-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-stone-900 text-sm">Verificación PIN</span>
            </div>

            {user?.role === 'owner' ? (
              <div className="space-y-2">
                {!pin ? (
                  <Button
                    onClick={handleGeneratePin}
                    disabled={loading || !bookingId}
                    size="sm"
                    className="w-full bg-purple-400 text-white hover:bg-purple-500 rounded-lg text-xs h-9"
                  >
                    Generar PIN
                  </Button>
                ) : (
                  <div className="bg-purple-50 p-2 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600 tracking-widest">{pin}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    maxLength={4}
                    value={verifyPin}
                    onChange={(e) => setVerifyPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN"
                    className="text-lg text-center tracking-widest h-9 rounded-lg"
                  />
                  <Button
                    onClick={handleVerifyPin}
                    disabled={loading || verifyPin.length !== 4}
                    size="sm"
                    className="bg-purple-400 text-white hover:bg-purple-500 rounded-lg px-3 h-9"
                  >
                    OK
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      <Card className="rounded-2xl border-stone-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              <span className="font-semibold text-stone-900 text-sm">Contactos Emergencia</span>
            </div>
            <Button
              onClick={() => setShowAddContact(!showAddContact)}
              size="sm"
              variant="ghost"
              className="text-[#28B463] h-8 text-xs p-0 hover:bg-transparent"
            >
              {showAddContact ? 'Cancelar' : '+ Agregar'}
            </Button>
          </div>

          {showAddContact && (
            <form onSubmit={handleAddContact} className="space-y-2 mb-3 p-3 bg-stone-50 rounded-xl transition-all">
              <Input
                placeholder="Nombre"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                required
                className="h-9 text-sm"
              />
              <Input
                placeholder="Teléfono"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                required
                className="h-9 text-sm"
              />
              <Input
                placeholder="Relación"
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                required
                className="h-9 text-sm"
              />
              <Button
                type="submit"
                disabled={loading}
                size="sm"
                className="w-full bg-sky-400 text-white hover:bg-sky-500 rounded-lg h-9"
              >
                Guardar
              </Button>
            </form>
          )}

          {emergencyContacts.length === 0 && !showAddContact ? (
            <p className="text-stone-400 text-xs text-center py-2">
              Sin contactos guardados
            </p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-2 bg-stone-50 rounded-lg border border-stone-100"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                    <div className="truncate">
                      <p className="font-medium text-xs text-stone-900 truncate">{contact.name}</p>
                      <p className="text-[10px] text-stone-500 truncate">{contact.relationship}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDeleteContact(contact.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 h-6 w-6 p-0 rounded-full"
                  >
                    ×
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
          variant="ghost"
          className="w-full rounded-xl h-10 text-stone-500"
        >
          Cerrar
        </Button>
      )}
    </div>
  );
};

export default SafetyCenter;
