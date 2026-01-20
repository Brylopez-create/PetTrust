import React, { useState, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { 
  Heart, Camera, X, Loader2, MapPin, 
  Smile, Meh, Frown, Moon, Send
} from 'lucide-react';

const WellnessReportForm = ({ isOpen, onClose, booking, onReportSent }) => {
  const [mood, setMood] = useState('happy');
  const [ate, setAte] = useState(false);
  const [drankWater, setDrankWater] = useState(false);
  const [bathroom, setBathroom] = useState(false);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const fileInputRef = useRef(null);

  const moods = [
    { value: 'happy', label: 'Feliz', icon: Smile, color: 'emerald' },
    { value: 'calm', label: 'Tranquilo', icon: Meh, color: 'sky' },
    { value: 'tired', label: 'Cansado', icon: Moon, color: 'purple' },
    { value: 'anxious', label: 'Ansioso', icon: Frown, color: 'amber' },
  ];

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      toast.error('Máximo 5 fotos');
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagen muy grande (máx 5MB)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result.split(',')[1];
        setPhotos(prev => [...prev, { data: base64, preview: event.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setGettingLocation(false);
          toast.success('Ubicación obtenida');
        },
        (error) => {
          setGettingLocation(false);
          toast.error('No se pudo obtener la ubicación');
        }
      );
    } else {
      setGettingLocation(false);
      toast.error('Geolocalización no soportada');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/wellness-reports`, {
        booking_id: booking.id,
        mood,
        ate,
        drank_water: drankWater,
        bathroom,
        notes,
        photos: photos.map(p => p.data),
        latitude: location?.lat,
        longitude: location?.lng
      });
      
      toast.success('Reporte enviado al dueño');
      onReportSent?.();
      onClose();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al enviar reporte';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Reporte de Bienestar
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pet Info */}
          <div className="bg-pink-50 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">🐕</p>
            <p className="font-semibold text-stone-900">{booking?.pet_name}</p>
            <p className="text-sm text-stone-600">
              {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Mood Selection */}
          <div>
            <Label className="text-sm font-medium text-stone-700 mb-3 block">
              ¿Cómo está la mascota?
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {moods.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    mood === m.value
                      ? `border-${m.color}-400 bg-${m.color}-50`
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                  data-testid={`mood-${m.value}`}
                >
                  <m.icon className={`w-6 h-6 mx-auto mb-1 ${
                    mood === m.value ? `text-${m.color}-500` : 'text-stone-400'
                  }`} />
                  <span className={`text-xs font-medium ${
                    mood === m.value ? `text-${m.color}-700` : 'text-stone-600'
                  }`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-stone-700">Actividades</Label>
            
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
              <span className="text-sm text-stone-700">🍖 Comió</span>
              <Switch checked={ate} onCheckedChange={setAte} />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
              <span className="text-sm text-stone-700">💧 Tomó agua</span>
              <Switch checked={drankWater} onCheckedChange={setDrankWater} />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
              <span className="text-sm text-stone-700">🚽 Hizo sus necesidades</span>
              <Switch checked={bathroom} onCheckedChange={setBathroom} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium text-stone-700 mb-2 block">
              Notas adicionales
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Algo especial que quieras compartir?"
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-stone-700">
                Fotos ({photos.length}/5)
              </Label>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={photos.length >= 5}
              >
                <Camera className="w-4 h-4 mr-1" />
                Agregar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo.preview}
                      alt={`Foto ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center justify-between p-3 bg-sky-50 rounded-xl">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span className="text-sm text-sky-700">
                {location ? 'Ubicación adjunta' : 'Agregar ubicación'}
              </span>
            </div>
            <Button
              type="button"
              onClick={getLocation}
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : location ? (
                '✓'
              ) : (
                'Obtener'
              )}
            </Button>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-full h-12"
            data-testid="send-wellness-report-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar al Dueño
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WellnessReportForm;
