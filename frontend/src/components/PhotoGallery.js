import React, { useState, useRef, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Camera, X, Loader2, Upload, Trash2, Image } from 'lucide-react';

const PhotoGallery = ({ 
  entityType, 
  entityId, 
  profileImage, 
  galleryImages = [], 
  editable = false,
  onPhotoUpdated 
}) => {
  const { user } = useContext(AuthContext);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploadType, setUploadType] = useState('gallery');
  const [uploading, setUploading] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState({});
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es muy grande (máx 5MB)');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1];
        
        await axios.post(`${API}/photos/upload`, {
          entity_type: entityType,
          entity_id: entityId,
          photo_type: uploadType,
          data: base64
        });

        toast.success(uploadType === 'profile' ? 'Foto de perfil actualizada' : 'Foto agregada a la galería');
        setShowUploadDialog(false);
        onPhotoUpdated?.();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const loadPhoto = async (photoId) => {
    if (loadedPhotos[photoId]) return;
    
    try {
      const response = await axios.get(`${API}/photos/${photoId}`);
      setLoadedPhotos(prev => ({
        ...prev,
        [photoId]: `data:image/jpeg;base64,${response.data.data}`
      }));
    } catch (error) {
      console.error('Error loading photo:', error);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await axios.delete(`${API}/photos/${photoId}`);
      toast.success('Foto eliminada');
      onPhotoUpdated?.();
      setShowViewDialog(false);
    } catch (error) {
      toast.error('Error al eliminar la foto');
    }
  };

  const openPhotoView = (photoId) => {
    loadPhoto(photoId);
    setSelectedPhoto(photoId);
    setShowViewDialog(true);
  };

  return (
    <div>
      {/* Profile Image */}
      <div className="mb-6">
        <div className="relative inline-block">
          <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 to-stone-100">
            {profileImage ? (
              <img 
                src={profileImage} 
                alt="Perfil" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                {entityType === 'walker' ? '🚶' : entityType === 'daycare' ? '🏠' : '🐕'}
              </div>
            )}
          </div>
          
          {editable && (
            <button
              onClick={() => {
                setUploadType('profile');
                setShowUploadDialog(true);
              }}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-colors"
              data-testid="change-profile-photo-btn"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-stone-900">Galería</h3>
          {editable && (
            <Button
              onClick={() => {
                setUploadType('gallery');
                setShowUploadDialog(true);
              }}
              variant="outline"
              size="sm"
              className="rounded-full"
              data-testid="add-gallery-photo-btn"
            >
              <Camera className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          )}
        </div>

        {galleryImages.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl p-8 text-center">
            <Image className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="text-stone-500 text-sm">
              {editable ? 'Agrega fotos a tu galería' : 'Sin fotos en la galería'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {galleryImages.map((photoId, index) => (
              <button
                key={photoId || index}
                onClick={() => openPhotoView(photoId)}
                onMouseEnter={() => loadPhoto(photoId)}
                className="aspect-square rounded-xl overflow-hidden bg-stone-100 hover:opacity-90 transition-opacity"
              >
                {loadedPhotos[photoId] ? (
                  <img 
                    src={loadedPhotos[photoId]} 
                    alt={`Galería ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {uploadType === 'profile' ? 'Cambiar foto de perfil' : 'Agregar a galería'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div 
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 animate-spin" />
                  <p className="text-stone-600">Subiendo foto...</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-stone-400 mx-auto mb-3" />
                  <p className="text-stone-600 font-medium">Toca para seleccionar foto</p>
                  <p className="text-sm text-stone-500 mt-1">JPG, PNG (máx 5MB)</p>
                </>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* View Photo Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="rounded-3xl max-w-lg p-0 overflow-hidden">
          {selectedPhoto && loadedPhotos[selectedPhoto] && (
            <>
              <img 
                src={loadedPhotos[selectedPhoto]}
                alt="Foto"
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              {editable && (
                <div className="p-4 flex justify-end">
                  <Button
                    onClick={() => handleDeletePhoto(selectedPhoto)}
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotoGallery;
