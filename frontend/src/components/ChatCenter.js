import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  MessageCircle, Send, ArrowLeft, User, Loader2, 
  CheckCheck, Clock 
} from 'lucide-react';

const ChatCenter = ({ isOpen, onClose }) => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/conversations`);
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}`);
      setMessages(response.data.messages);
      setSelectedConversation(response.data.conversation);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      await axios.post(`${API}/conversations/${selectedConversation.id}/messages`, {
        content: newMessage
      });
      setNewMessage('');
      await fetchMessages(selectedConversation.id);
    } catch (error) {
      toast.error('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setMessages([]);
    fetchConversations();
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  const isMyMessage = (message) => {
    if (user?.role === 'owner') {
      return message.sender_role === 'owner';
    }
    return message.sender_role !== 'owner';
  };

  const getUnreadCount = (conversation) => {
    if (user?.role === 'owner') {
      return conversation.owner_unread || 0;
    }
    return conversation.provider_unread || 0;
  };

  const getOtherPartyName = (conversation) => {
    if (user?.role === 'owner') {
      return conversation.provider_name;
    }
    return conversation.owner_name;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[600px] p-0 rounded-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#78C494] text-white p-4">
          {selectedConversation ? (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-[#28B463] p-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{getOtherPartyName(selectedConversation)}</p>
                <p className="text-xs text-emerald-100">
                  {selectedConversation.provider_type === 'walker' ? 'Paseador' : 'Guardería'}
                </p>
              </div>
            </div>
          ) : (
            <DialogHeader className="p-0">
              <DialogTitle className="text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Mensajes
              </DialogTitle>
            </DialogHeader>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {selectedConversation ? (
            /* Messages View */
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-500">Inicia la conversación</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isMine = isMyMessage(message);
                    const showDate = index === 0 || 
                      formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);
                    
                    return (
                      <React.Fragment key={message.id}>
                        {showDate && (
                          <div className="text-center">
                            <span className="text-xs text-stone-500 bg-stone-200 px-3 py-1 rounded-full">
                              {formatDate(message.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                              isMine
                                ? 'bg-[#78C494] text-white rounded-br-md'
                                : 'bg-white text-stone-800 rounded-bl-md shadow-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                              isMine ? 'text-emerald-100' : 'text-stone-400'
                            }`}>
                              <span className="text-xs">{formatTime(message.created_at)}</span>
                              {isMine && (
                                message.read 
                                  ? <CheckCheck className="w-3 h-3" />
                                  : <Clock className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-stone-200">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 rounded-full border-stone-200"
                    disabled={sending}
                    data-testid="chat-input"
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-[#78C494] hover:bg-[#28B463] text-white rounded-full w-10 h-10 p-0"
                    data-testid="send-message-btn"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            /* Conversations List */
            <div className="overflow-y-auto h-full">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#28B463]" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-600 font-medium mb-2">Sin conversaciones</p>
                  <p className="text-sm text-stone-500">
                    {user?.role === 'owner' 
                      ? 'Inicia una conversación desde el perfil de un paseador o guardería'
                      : 'Los dueños de mascotas te contactarán aquí'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className="w-full p-4 hover:bg-stone-50 transition-colors text-left"
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-[#28B463]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-stone-900 truncate">
                              {getOtherPartyName(conversation)}
                            </p>
                            {conversation.last_message_at && (
                              <span className="text-xs text-stone-500">
                                {formatDate(conversation.last_message_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-stone-500 truncate">
                              {conversation.last_message || 'Sin mensajes'}
                            </p>
                            {getUnreadCount(conversation) > 0 && (
                              <Badge className="bg-[#78C494] text-white rounded-full h-5 min-w-5 px-1.5">
                                {getUnreadCount(conversation)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatCenter;
