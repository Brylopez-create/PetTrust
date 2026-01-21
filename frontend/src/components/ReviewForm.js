import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Star, Loader2 } from 'lucide-react';

const ReviewForm = ({ isOpen, onClose, booking, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Por favor escribe un comentario');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/reviews`, {
        booking_id: booking.id,
        rating,
        comment: comment.trim()
      });
      
      toast.success('¡Gracias por tu reseña!');
      onReviewSubmitted?.();
      onClose();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al enviar reseña';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = (r) => {
    switch (r) {
      case 1: return 'Muy malo';
      case 2: return 'Malo';
      case 3: return 'Regular';
      case 4: return 'Bueno';
      case 5: return 'Excelente';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-center">
            Califica tu experiencia
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Info */}
          <div className="bg-stone-50 rounded-2xl p-4 text-center">
            <p className="font-semibold text-stone-900">{booking?.service_name}</p>
            <p className="text-sm text-stone-600">
              {booking?.service_type === 'walker' ? 'Paseo' : 'Guardería'} · {new Date(booking?.date).toLocaleDateString('es-CO')}
            </p>
            {booking?.pet_name && (
              <p className="text-sm text-stone-500 mt-1">🐕 {booking.pet_name}</p>
            )}
          </div>

          {/* Star Rating */}
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                  data-testid={`star-${star}`}
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-medium text-stone-600">
              {getRatingText(hoveredRating || rating)}
            </p>
          </div>

          {/* Comment */}
          <div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos sobre tu experiencia..."
              className="min-h-[120px] rounded-xl resize-none"
              data-testid="review-comment"
            />
            <p className="text-xs text-stone-500 mt-1 text-right">
              {comment.length}/500 caracteres
            </p>
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2">
            {['Puntual', 'Amable', 'Profesional', 'Mi mascota llegó feliz', 'Buena comunicación'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setComment(prev => prev ? `${prev} ${tag}.` : `${tag}.`)}
                className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm hover:bg-emerald-100 transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-full"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#78C494] hover:bg-[#28B463] text-white rounded-full"
              data-testid="submit-review-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Enviar Reseña
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewForm;
