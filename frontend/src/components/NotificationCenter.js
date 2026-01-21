import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  Bell, Check, CheckCheck, Star, MessageCircle, 
  AlertTriangle, Heart, Camera, Loader2, Volume2, VolumeX
} from 'lucide-react';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2telegs/ldvxqnQGOY3k+7uHCTiJ6f/telegsNT/telegsZgMPk9jxrJ1eYmh0eHh0cGdeOTtZfa/v2pYLEYq25NS7hRInfdzLiA4lgt32fB05gtjypN+4cBMxisrrlYSLO5C85OS4cRE3jc31qIuLPZS+8uS7cxQ6j871q46LPJK98ua7cxU7kM/3rJCMO5K+8ua9dRY8kdD3rpOMO5O+8ue+dhc+ktH4r5WNPZXz69rNlGdBPaHy79PIkGM/PKLz8NXLj2I+O6Pz8dbMj2M+PKTz8tfNj2Q+O6T08tjPkGQ/O6X08tnQkWVAO6b19NrRkmZAPKf19dvSk2dBPKj29tzTlGhCPaj29t3UlWhCPan39t7VlmlDPqn399/WmGpEPqr4+ODXmWtFP6v4+OHYm2xGP6z5+eLZnG1HQKz5+ePanW5IQK35+uTbn29JQa75+uXcn3BJQa75+uXcoHBKQq/5++bdoXFLQ6/6++feonJMRLD6++jfpHNNRbD7/OnhpXVPRrH7/OripnZQRrH7/OvjqHdRR7L7/ezkqnlTSLL8/e3lq3pUSbP8/e7mrXtVSrP8/e/nsHxXS7P9/vDos31YTbT9/vHqtH9aTrX9/vLruIFcT7b+//Ttu4NgULf+//XvvoVjUrj+//bwwIZlU7n///fxwYhoVbr///jyw4pqV7v///rzyI1uW7z///v00ZJ0YcD///3119d9asT///7339yDbMb///3349+JcMj///v35OWRdcr///n259+MccX///j15OGPdMn///r36OWSeMz///v47OuYfs////z58fClh9T////++/XeqYXP////+vPYo4HK////9u/RnHrE////8urJlHG9////7eTBi2e1////5924f1ur////3te0dU+g////1M2qakOR////y8KfXTaC////wrenUCdz////t6yeRBhl');
    
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Polling for new notifications
  useEffect(() => {
    if (!user) return;
    
    const checkNewNotifications = async () => {
      try {
        const response = await axios.get(`${API}/notifications/unread/count`);
        const newCount = response.data.unread_count;
        
        // Play sound if new notifications arrived
        if (newCount > prevCountRef.current && soundEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {});
          // Also show browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification('PetTrust', {
              body: 'Tienes nuevas notificaciones',
              icon: '🐾'
            });
          }
        }
        prevCountRef.current = newCount;
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(checkNewNotifications, 10000);
    checkNewNotifications();
    
    return () => clearInterval(interval);
  }, [user, soundEnabled]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      toast.error('Error al marcar notificaciones');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'new_request': return <Bell className="w-5 h-5 text-[#28B463]" />;
      case 'booking_confirmed': return <Check className="w-5 h-5 text-sky-500" />;
      case 'message': return <MessageCircle className="w-5 h-5 text-purple-500" />;
      case 'review': return <Star className="w-5 h-5 text-amber-500" />;
      case 'wellness_report': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'sos': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-stone-500" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[500px] p-0 rounded-3xl overflow-hidden flex flex-col">
        <div className="bg-[#78C494] text-white p-4">
          <DialogHeader className="p-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificaciones
                {unreadCount > 0 && (
                  <Badge className="bg-white/20 text-white rounded-full">
                    {unreadCount}
                  </Badge>
                )}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 p-1"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 text-xs"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Marcar todas
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#28B463]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bell className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-600 font-medium">Sin notificaciones</p>
              <p className="text-sm text-stone-500">Las nuevas notificaciones aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`w-full p-4 text-left transition-colors ${
                    notification.read ? 'bg-white' : 'bg-emerald-50'
                  } hover:bg-stone-50`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      notification.read ? 'bg-stone-100' : 'bg-emerald-100'
                    }`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-semibold truncate ${
                          notification.read ? 'text-stone-700' : 'text-stone-900'
                        }`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-stone-500 flex-shrink-0 ml-2">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className={`text-sm line-clamp-2 ${
                        notification.read ? 'text-stone-500' : 'text-stone-600'
                      }`}>
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-[#78C494] rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationCenter;
