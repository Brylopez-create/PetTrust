import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '../App';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from './ui/sheet';
import { Badge } from './ui/badge';
import { User, LogOut, LayoutDashboard, Shield, Menu, X, Search, Home, MessageCircle, Dog } from 'lucide-react';
import SafetyCenter from './SafetyCenter';
import ChatCenter from './ChatCenter';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showSafety, setShowSafety] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API}/conversations/unread/count`);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo-pettrust.png" alt="PetTrust Logo" className="w-10 h-10 rounded-full object-cover" />
              <div className="flex flex-col">
                <span className="text-xl font-heading font-bold text-[#0F4C75]">PetTrust</span>
                <span className="text-xs text-[#28B463] -mt-1">Bogotá</span>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {(!user || user.role === 'owner') && (
                <>
                  <Link to="/explorar" className="text-stone-700 hover:text-[#28B463] font-medium transition-colors">
                    Explorar
                  </Link>
                  {(location.pathname === '/' || location.pathname === '/paseadores') && (
                    <Link to="/paseadores" className="text-[#28B463] hover:text-emerald-700 font-bold transition-colors" data-testid="walker-landing-link">
                      Sé un Paseador {(!user) && <Badge variant="secondary" className="ml-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Nuevo</Badge>}
                    </Link>
                  )}
                </>
              )}
              {user ? (
                <>
                  <Button
                    onClick={() => setShowChat(true)}
                    variant="ghost"
                    className="text-stone-700 hover:text-[#28B463] relative"
                    data-testid="chat-center-btn"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Mensajes
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-5 min-w-5 px-1.5 text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowSafety(true)}
                    variant="ghost"
                    className="text-[#28B463] hover:text-emerald-700"
                    data-testid="safety-center-btn"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Seguridad
                  </Button>
                  <Link
                    to={user.role === 'admin' ? '/admin' : (user.role === 'owner' ? '/dashboard' : '/provider-dashboard')}
                    className="text-stone-700 hover:text-[#28B463] font-medium transition-colors flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="text-stone-700 hover:text-[#28B463]"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Salir
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="text-stone-700 hover:text-[#28B463]" data-testid="login-btn">
                      <User className="w-4 h-4 mr-2" />
                      Ingresar
                    </Button>
                  </Link>
                  <Link to="/registro">
                    <Button className="bg-[#28B463] text-white hover:bg-[#78C494] rounded-full shadow-lg shadow-green-100" data-testid="register-btn">
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="ghost" data-testid="mobile-menu-btn">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-stone-200">
                      <div className="flex items-center gap-2">
                        <img src="/logo-pettrust.png" alt="PetTrust Logo" className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex flex-col">
                          <span className="font-heading font-bold text-[#0F4C75]">PetTrust</span>
                          <span className="text-xs text-[#28B463] -mt-0.5">Bogotá</span>
                        </div>
                      </div>
                      <SheetClose asChild>
                        <Button size="sm" variant="ghost">
                          <X className="w-5 h-5" />
                        </Button>
                      </SheetClose>
                    </div>

                    {/* User Info */}
                    {user && (
                      <div className="p-4 bg-emerald-50 border-b border-[#28B463]-100">
                        <p className="font-semibold text-stone-900">{user.name}</p>
                        <p className="text-sm text-stone-600">{user.email}</p>
                        <span className="inline-block mt-2 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                          {user.role === 'owner' ? 'Dueño' : user.role === 'walker' ? 'Paseador' : user.role === 'daycare' ? 'Guardería' : 'Admin'}
                        </span>
                      </div>
                    )}

                    {/* Menu Items */}
                    <div className="flex-1 p-4 space-y-2">
                      <SheetClose asChild>
                        <Link
                          to="/"
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-100 transition-colors"
                          onClick={closeMobileMenu}
                        >
                          <Home className="w-5 h-5 text-stone-600" />
                          <span className="font-medium text-stone-700">Inicio</span>
                        </Link>
                      </SheetClose>

                      {(!user || user.role === 'owner') && (
                        <>
                          <SheetClose asChild>
                            <Link
                              to="/explorar"
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-100 transition-colors"
                              onClick={closeMobileMenu}
                            >
                              <Search className="w-5 h-5 text-stone-600" />
                              <span className="font-medium text-stone-700">Explorar</span>
                            </Link>
                          </SheetClose>
                          {(location.pathname === '/' || location.pathname === '/paseadores') && (
                            <SheetClose asChild>
                              <Link
                                to="/paseadores"
                                className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 text-[#28B463] hover:bg-emerald-100 transition-colors"
                                onClick={closeMobileMenu}
                              >
                                <Dog className="w-5 h-5" />
                                <span className="font-bold">Sé un Paseador</span>
                              </Link>
                            </SheetClose>
                          )}
                        </>
                      )}

                      {user ? (
                        <>
                          <SheetClose asChild>
                            <Link
                              to={user.role === 'admin' ? '/admin' : (user.role === 'owner' ? '/dashboard' : '/provider-dashboard')}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-100 transition-colors"
                              onClick={closeMobileMenu}
                            >
                              <LayoutDashboard className="w-5 h-5 text-stone-600" />
                              <span className="font-medium text-stone-700">Dashboard</span>
                            </Link>
                          </SheetClose>

                          <button
                            onClick={() => {
                              closeMobileMenu();
                              setShowSafety(true);
                            }}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 transition-colors w-full text-left"
                          >
                            <Shield className="w-5 h-5 text-[#28B463]" />
                            <span className="font-medium text-[#28B463]">Centro de Seguridad</span>
                          </button>

                          <button
                            onClick={() => {
                              closeMobileMenu();
                              setShowChat(true);
                            }}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-100 transition-colors w-full text-left relative"
                          >
                            <MessageCircle className="w-5 h-5 text-stone-600" />
                            <span className="font-medium text-stone-700">Mensajes</span>
                            {unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white rounded-full h-5 min-w-5 px-1.5 text-xs ml-auto">
                                {unreadCount}
                              </Badge>
                            )}
                          </button>

                          <div className="pt-4 border-t border-stone-200 mt-4">
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors w-full text-left"
                              data-testid="mobile-logout-btn"
                            >
                              <LogOut className="w-5 h-5 text-red-500" />
                              <span className="font-medium text-red-500">Cerrar Sesión</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="pt-4 space-y-3">
                          <SheetClose asChild>
                            <Link to="/login" onClick={closeMobileMenu}>
                              <Button variant="outline" className="w-full rounded-xl h-12">
                                <User className="w-4 h-4 mr-2" />
                                Ingresar
                              </Button>
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link to="/registro" onClick={closeMobileMenu}>
                              <Button className="w-full bg-[#28B463] text-white hover:bg-[#78C494] rounded-xl h-12">
                                Registrarse
                              </Button>
                            </Link>
                          </SheetClose>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-stone-200 text-center">
                      <p className="text-xs text-stone-500">PetTrust Bogotá © 2025</p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
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

      {/* Chat Center */}
      <ChatCenter
        isOpen={showChat}
        onClose={() => {
          setShowChat(false);
          fetchUnreadCount();
        }}
      />
    </>
  );
};

export default Navbar;
