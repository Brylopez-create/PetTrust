import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const ReviewForm = ({ bookingId, providerId, isOpen, onClose, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (comment.length < 10) {
      toast.error('Por favor escribe un comentario más detallado (mínimo 10 caracteres)');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/reviews`, {
        booking_id: bookingId,
        provider_id: providerId,
        rating,
        comment
      });
      toast.success('¡Gracias por tu reseña!');
      if (onReviewSubmitted) onReviewSubmitted();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Error al enviar reseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-stone-50 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-heading font-bold text-[#0F4C75]">Califica tu Experiencia</DialogTitle>
          <DialogDescription className="text-center text-stone-600">
            ¿Qué tal estuvo el servicio? Tu opinión ayuda a otros dueños.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                />
              </button>
            ))}
          </div>

          <div className="text-center font-medium text-stone-700">
            {rating === 5 ? '¡Excelente!' :
              rating === 4 ? 'Muy bueno' :
                rating === 3 ? 'Regular' :
                  rating === 2 ? 'Malo' : 'Terrible'}
          </div>

          <Textarea
            placeholder="Escribe tu comentario aquí..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px] bg-white border-stone-200"
            required
          />

          <Button
            type="submit"
            className="w-full bg-[#28B463] hover:bg-[#209e53] text-white rounded-xl h-12 text-lg"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : 'Enviar Reseña'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewForm;
