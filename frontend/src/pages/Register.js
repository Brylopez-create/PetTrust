import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'owner'
  });
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-3xl border-stone-200 shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex flex-col items-center">
            <img src="/logo-pettrust.png" alt="PetTrust Logo" className="w-20 h-20 rounded-full object-cover mb-2" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-heading font-bold text-[#0F4C75]">PetTrust</span>
              <span className="text-sm text-[#28B463] font-medium -mt-1">Bogotá</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-heading font-bold text-stone-900">
            Crear Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-stone-700">Nombre Completo</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2 h-12 rounded-xl border-stone-200"
                required
                data-testid="register-name-input"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-stone-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2 h-12 rounded-xl border-stone-200"
                required
                data-testid="register-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-stone-700">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-2 h-12 rounded-xl border-stone-200"
                minLength={6}
                required
                data-testid="register-password-input"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-stone-700">Teléfono (Opcional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-2 h-12 rounded-xl border-stone-200"
                data-testid="register-phone-input"
              />
            </div>

            <div>
              <Label className="text-stone-700 mb-3 block">Tipo de Cuenta</Label>
              <RadioGroup value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })} data-testid="role-radio-group">
                <div className="flex items-center space-x-2 p-3 border border-stone-200 rounded-xl hover:bg-stone-50">
                  <RadioGroupItem value="owner" id="owner" data-testid="role-owner" />
                  <Label htmlFor="owner" className="cursor-pointer flex-1">Dueño de Mascota</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border border-stone-200 rounded-xl hover:bg-stone-50">
                  <RadioGroupItem value="walker" id="walker" data-testid="role-walker" />
                  <Label htmlFor="walker" className="cursor-pointer flex-1">Paseador</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border border-stone-200 rounded-xl hover:bg-stone-50">
                  <RadioGroupItem value="daycare" id="daycare" data-testid="role-daycare" />
                  <Label htmlFor="daycare" className="cursor-pointer flex-1">Guardería</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border border-stone-200 rounded-xl hover:bg-stone-50">
                  <RadioGroupItem value="vet" id="vet" data-testid="role-vet" />
                  <Label htmlFor="vet" className="cursor-pointer flex-1">Veterinario</Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#0F4C75] text-white hover:bg-[#368DD1] rounded-full text-lg font-semibold shadow-lg shadow-blue-100"
              data-testid="register-submit-btn"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#28B463] font-semibold hover:text-[#78C494]" data-testid="go-to-login-link">
              Inicia sesión aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
