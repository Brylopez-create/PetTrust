import React, { useState, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Upload, X, Loader2, CheckCircle, Image as ImageIcon } from 'lucide-react';

/**
 * Reusable image upload component for PetTrust
 * Supports drag & drop, file input, preview, and Cloudinary upload
 * 
 * @param {string} folder - Cloudinary folder (pets, licenses, payments, profiles, gallery)
 * @param {function} onUploadComplete - Callback with uploaded URL
 * @param {string} currentImage - Optional existing image URL
 * @param {boolean} required - Whether image is mandatory
 * @param {string} label - Label text for the upload zone
 */
const ImageUpload = ({
    folder = "general",
    onUploadComplete,
    currentImage = null,
    required = false,
    label = "Subir Imagen"
}) => {
    const [preview, setPreview] = useState(currentImage);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState(currentImage);
    const fileInputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Solo se permiten imágenes (JPEG, PNG, WebP, GIF)');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no puede superar 5MB');
            return;
        }

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);

        // Upload to Cloudinary via our API
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            const response = await axios.post(`${API}/uploads/image`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const url = response.data.url;
            setUploadedUrl(url);
            setPreview(url);
            toast.success('Imagen subida correctamente');

            if (onUploadComplete) {
                onUploadComplete(url);
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.detail || 'Error al subir la imagen');
            setPreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        setUploadedUrl(null);
        if (onUploadComplete) {
            onUploadComplete(null);
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium text-stone-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {preview ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-stone-200 bg-stone-50">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    {uploading ? (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="absolute top-2 right-2 flex gap-2">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    className="h-8 w-8 rounded-full"
                                    onClick={handleRemove}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            {uploadedUrl && (
                                <div className="absolute bottom-2 left-2 bg-[#78C494] text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Subida
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div
                    className={`relative w-full h-48 rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3
            ${dragActive
                            ? 'border-[#28B463]-500 bg-emerald-50'
                            : 'border-stone-300 bg-stone-50 hover:border-[#28B463]-400 hover:bg-emerald-50/50'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleChange}
                        className="hidden"
                    />

                    {uploading ? (
                        <Loader2 className="w-10 h-10 text-[#28B463] animate-spin" />
                    ) : (
                        <>
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                                <ImageIcon className="w-7 h-7 text-[#28B463]" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-stone-700">
                                    Arrastra una imagen o haz clic
                                </p>
                                <p className="text-xs text-stone-500 mt-1">
                                    JPEG, PNG, WebP o GIF (máx. 5MB)
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
