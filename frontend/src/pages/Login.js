import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      login(response.data.token, response.data.user);
      toast.success('¡Bienvenido de vuelta!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-stone-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-3xl border-stone-200 shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl">🐾</span>
          </div>
          <CardTitle className="text-2xl font-heading font-bold text-stone-900">
            Iniciar Sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-stone-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2 h-12 rounded-xl border-stone-200 focus:ring-emerald-400"
                placeholder="tu@email.com"
                required
                data-testid="login-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-stone-700">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-2 h-12 rounded-xl border-stone-200 focus:ring-emerald-400"
                placeholder="••••••••"
                required
                data-testid="login-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-emerald-400 text-white hover:bg-emerald-500 rounded-full text-lg font-semibold shadow-lg shadow-emerald-100"
              data-testid="login-submit-btn"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-600">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-emerald-600 font-semibold hover:text-emerald-700" data-testid="go-to-register-link">
              Regístrate aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;