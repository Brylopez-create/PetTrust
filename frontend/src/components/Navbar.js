import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { User, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import SafetyCenter from './SafetyCenter';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showSafety, setShowSafety] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">🐾</span>
            </div>
            <span className="text-xl font-heading font-bold text-stone-900">PetTrust</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/explorar" className="text-stone-700 hover:text-emerald-600 font-medium transition-colors">
              Explorar
            </Link>
            {user ? (
              <>
                <Button
                  onClick={() => setShowSafety(true)}
                  variant="ghost"
                  className="text-emerald-600 hover:text-emerald-700"
                  data-testid="safety-center-btn"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Seguridad
                </Button>
                <Link to="/dashboard" className="text-stone-700 hover:text-emerald-600 font-medium transition-colors flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="text-stone-700 hover:text-emerald-600"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-stone-700 hover:text-emerald-600" data-testid="login-btn">
                    <User className="w-4 h-4 mr-2" />
                    Ingresar
                  </Button>
                </Link>
                <Link to="/registro">
                  <Button className="bg-emerald-400 text-white hover:bg-emerald-500 rounded-full shadow-lg shadow-emerald-100" data-testid="register-btn">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" variant="ghost" data-testid="mobile-dashboard-btn">
                  <LayoutDashboard className="w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm" variant="ghost" data-testid="mobile-login-btn">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>

      {/* Safety Center Dialog */}
      <Dialog open={showSafety} onOpenChange={setShowSafety}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <SafetyCenter onClose={() => setShowSafety(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;