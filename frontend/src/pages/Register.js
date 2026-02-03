import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AuthContext, API } from '../App';
import ImageUpload from '../components/ImageUpload';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'owner',
    onboarding_token: null,
    profile_image: null // New field
  });
  const [loading, setLoading] = useState(false);
  const [isProspect, setIsProspect] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      setFormData(prev => ({ ...prev, onboarding_token: token }));
      setIsProspect(true);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, formData);
      login(response.data.token, response.data.user);
      toast.success('¡Cuenta creada exitosamente!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md rounded-3xl border-stone-200 shadow-xl overflow-hidden">
        <CardHeader className="text-center bg-white pb-2 sm:pb-6">
          <div className="flex flex-col items-center">
            {/* Compact Logo Header */}
            <div className="mb-2 sm:mb-4 flex items-center gap-3">
              <img src="/logo-pettrust.png" alt="PetTrust" className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover shadow-sm" />
              <div className="text-left">
                <span className="text-lg sm:text-xl font-heading font-bold text-[#0F4C75] block leading-none">PetTrust</span>
                <span className="text-xs sm:text-sm text-[#28B463] font-medium block">Bogotá</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-heading font-bold text-stone-900">
            {isProspect ? 'Finalizar Registro' : 'Crear Cuenta'}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Únete a la comunidad de mascotas más confiable
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 bg-white">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">

            {/* Account Type - Top Priority */}
            <div>
              <Label className="text-stone-700 text-xs sm:text-sm font-semibold mb-2 block">Soy...</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                data-testid="role-radio-group"
                disabled={isProspect}
                className="grid grid-cols-2 gap-2"
              >
                <div className="relative">
                  <RadioGroupItem value="owner" id="owner" className="peer sr-only" data-testid="role-owner" />
                  <Label
                    htmlFor="owner"
                    className="flex flex-col items-center justify-center p-2 sm:p-3 border-2 border-stone-100 rounded-xl hover:bg-stone-50 peer-data-[state=checked]:border-[#0F4C75] peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all h-20 sm:h-24 text-center"
                  >
                    <span className="text-2xl mb-1">👤</span>
                    <span className="text-xs sm:text-sm font-medium">Dueño</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="walker" id="walker" className="peer sr-only" data-testid="role-walker" />
                  <Label
                    htmlFor="walker"
                    className="flex flex-col items-center justify-center p-2 sm:p-3 border-2 border-stone-100 rounded-xl hover:bg-stone-50 peer-data-[state=checked]:border-[#28B463] peer-data-[state=checked]:bg-green-50 cursor-pointer transition-all h-20 sm:h-24 text-center"
                  >
                    <span className="text-2xl mb-1">🐕</span>
                    <span className="text-xs sm:text-sm font-medium">Paseador</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="daycare" id="daycare" className="peer sr-only" data-testid="role-daycare" />
                  <Label
                    htmlFor="daycare"
                    className="flex flex-col items-center justify-center p-2 sm:p-3 border-2 border-stone-100 rounded-xl hover:bg-stone-50 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-50 cursor-pointer transition-all h-20 sm:h-24 text-center"
                  >
                    <span className="text-2xl mb-1">🏠</span>
                    <span className="text-xs sm:text-sm font-medium">Guardería</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="vet" id="vet" className="peer sr-only" data-testid="role-vet" />
                  <Label
                    htmlFor="vet"
                    className="flex flex-col items-center justify-center p-2 sm:p-3 border-2 border-stone-100 rounded-xl hover:bg-stone-50 peer-data-[state=checked]:border-blue-400 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all h-20 sm:h-24 text-center"
                  >
                    <span className="text-2xl mb-1">⚕️</span>
                    <span className="text-xs sm:text-sm font-medium">Veterinario</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div>
                <Input
                  id="name"
                  placeholder="Nombre Completo"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-10 sm:h-12 rounded-xl border-stone-200 bg-stone-50 focus:bg-white transition-colors"
                  required
                  data-testid="register-name-input"
                  readOnly={isProspect}
                />
              </div>

              <div>
                <Input
                  id="email"
                  placeholder="Correo Electrónico"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-10 sm:h-12 rounded-xl border-stone-200 bg-stone-50 focus:bg-white transition-colors"
                  required
                  data-testid="register-email-input"
                  readOnly={isProspect}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="phone"
                  placeholder="Teléfono/Celular"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-10 sm:h-12 rounded-xl border-stone-200 bg-stone-50 focus:bg-white transition-colors"
                  data-testid="register-phone-input"
                  readOnly={isProspect}
                />
                <Input
                  id="password"
                  placeholder="Contraseña"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-10 sm:h-12 rounded-xl border-stone-200 bg-stone-50 focus:bg-white transition-colors"
                  minLength={6}
                  required
                  data-testid="register-password-input"
                />
              </div>
            </div>

            {/* Profile Image - Moved to bottom and made compact */}
            <div className="pt-2">
              <Label className="text-xs text-stone-500 mb-2 block text-center">Foto de Perfil (Opcional)</Label>
              <div className="flex justify-center">
                <div className="w-24 sm:w-28">
                  <ImageUpload
                    folder="profiles"
                    label=""
                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, profile_image: url }))}
                    currentImage={formData.profile_image}
                    compact={true}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-12 bg-[#0F4C75] text-white hover:bg-[#368DD1] rounded-xl text-base sm:text-lg font-bold shadow-lg shadow-blue-100 mt-4"
              data-testid="register-submit-btn"
            >
              {loading ? 'Procesando...' : (isProspect ? 'Finalizar' : 'Crear Cuenta')}
            </Button>
          </form>

          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-stone-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#28B463] font-bold hover:text-[#78C494]" data-testid="go-to-login-link">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


export default Register;
