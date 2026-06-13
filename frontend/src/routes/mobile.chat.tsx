import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Send, 
  MessageCircle, 
  User, 
  Building2, 
  Loader2,
  Trash2
} from "lucide-react";
import { api, type Conversation, type Message, type User as ApiUser } from "@/lib/api";
import { toast } from "sonner";
import { useRole, ROLE_LABEL, getStoredUser } from "@/lib/role";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/mobile/chat")({
  component: Chat,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      conversationId: search.conversationId as string | undefined,
      view: (search.view as 'list' | 'chat' | 'users' | undefined) || 'list',
    };
  },
});

function Chat() {
  const navigate = useNavigate({ from: "/mobile/chat" });
  const search = useSearch({ from: "/mobile/chat" });
  const { conversationId, view } = search;
  
  const role = useRole();
  const currentUser = getStoredUser();
  const isAdmin = role?.toLowerCase() === 'admin';
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Partial<ApiUser>[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    // Refresh conversations every 10 seconds
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (view === 'users') {
      fetchAvailableUsers();
    }
  }, [view]);

  useEffect(() => {
    if (conversationId && view === 'chat') {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        openConversation(conv);
      }
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);
      const users = isAdmin 
        ? await api.getStaffUsers() 
        : await api.getAdminUsers();
      setAvailableUsers(users);
    } catch (err) {
      console.error('Failed to fetch users', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    try {
      setLoading(true);
      setSelectedConversation(conversation);
      const response = await api.getConversationMessages(conversation.id, { limit: 100 });
      setMessages(response.data);
      
      if (conversation.unreadCount > 0) {
        await api.markConversationAsRead(conversation.id);
        fetchConversations();
      }
      
      navigate({
        search: { conversationId: conversation.id, view: 'chat' },
      });
    } catch (err) {
      console.error('Failed to load messages', err);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async (user: Partial<ApiUser>) => {
    const existing = conversations.find(
      c => c.otherParticipant.id === user.id
    );
    
    if (existing) {
      openConversation(existing);
      return;
    }

    const tempConversation: Conversation = {
      id: 'new',
      participant1Id: currentUser!.id,
      participant2Id: user.id!,
      participant1: currentUser as any,
      participant2: user as any,
      otherParticipant: user as any,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setSelectedConversation(tempConversation);
    setMessages([]);
    navigate({
      search: { conversationId: 'new', view: 'chat' },
    });
  };

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const recipientId = selectedConversation.otherParticipant.id;
      const message = await api.sendMessage(recipientId, messageContent.trim());
      
      setMessages(prev => [...prev, message]);
      setMessageContent('');
      fetchConversations();
      
      if (selectedConversation.id === 'new') {
        const conversations = await api.getConversations();
        const newConv = conversations.find(c => c.otherParticipant.id === recipientId);
        if (newConv) {
          setSelectedConversation(newConv);
          navigate({
            search: { conversationId: newConv.id, view: 'chat' },
          });
        }
      }
    } catch (err) {
      console.error('Failed to send message', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Delete this conversation?')) return;

    try {
      await api.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      navigate({ search: { view: 'list' } });
      toast.success('Conversation deleted');
    } catch (err) {
      console.error('Failed to delete conversation', err);
      toast.error('Failed to delete conversation');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (view === 'list') {
    return (
      <PhoneFrame title="Messages" showBackButton={true}>
        <div className="flex flex-col h-full bg-slate-50">
          <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <h2 className="font-bold text-lg">Messages</h2>
              </div>
              <Button 
                size="sm"
                variant="secondary"
                onClick={() => navigate({ search: { view: 'users' } })}
              >
                <User className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageCircle className="h-16 w-16 text-slate-400 mb-4" />
                <p className="text-sm font-medium text-slate-600">No conversations</p>
                <p className="text-xs text-slate-500 mt-2">
                  Start a chat with {isAdmin ? 'staff' : 'admin'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={cn(
                      "p-4 active:bg-slate-100 transition-colors flex items-start gap-3",
                      conv.unreadCount > 0 && "bg-emerald-50"
                    )}
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold">
                        {getInitials(conv.otherParticipant.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm truncate">
                          {conv.otherParticipant.name}
                        </h4>
                        {conv.unreadCount > 0 && (
                          <Badge className="ml-2 bg-emerald-600 text-white text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-500 mb-1">
                        {ROLE_LABEL[conv.otherParticipant.role.toLowerCase()]}
                      </p>
                      
                      <p className="text-xs text-slate-600 truncate">
                        {conv.lastMessage || 'No messages'}
                      </p>
                      
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (view === 'users') {
    return (
      <PhoneFrame 
        title={`Select ${isAdmin ? 'Staff' : 'Admin'}`}
        showBackButton={true}
        onBackClick={() => navigate({ search: { view: 'list' } })}
      >
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <User className="h-16 w-16 text-slate-400 mb-4" />
              <p className="text-sm font-medium text-slate-600">No users available</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => startNewChat(user)}
                  className="p-4 active:bg-slate-100 transition-colors flex items-center gap-3"
                >
                  <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold">
                      {getInitials(user.name!)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{user.name}</h4>
                    <p className="text-xs text-slate-500">
                      {ROLE_LABEL[user.role!.toLowerCase()]}
                    </p>
                    {(user as any).facility && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3" />
                        {(user as any).facility.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PhoneFrame>
    );
  }

  // Chat view
  return (
    <PhoneFrame 
      title={selectedConversation?.otherParticipant.name || 'Chat'}
      subtitle={selectedConversation ? ROLE_LABEL[selectedConversation.otherParticipant.role.toLowerCase()] : undefined}
      showBackButton={true}
      onBackClick={() => navigate({ search: { view: 'list' } })}
    >
      <div className="flex flex-col h-full">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="h-16 w-16 text-slate-400 mb-4" />
                  <p className="text-sm font-medium text-slate-600">No messages</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Start the conversation
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOwn = msg.senderId === currentUser?.id;
                  const showDate = idx === 0 || 
                    format(new Date(messages[idx - 1].createdAt), 'PP') !== 
                    format(new Date(msg.createdAt), 'PP');

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center justify-center my-3">
                          <Badge variant="outline" className="text-xs bg-white">
                            {format(new Date(msg.createdAt), 'PPP')}
                          </Badge>
                        </div>
                      )}
                      
                      <div className={cn(
                        "flex",
                        isOwn ? "justify-end" : "justify-start"
                      )}>
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
                          isOwn 
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-br-sm" 
                            : "bg-white rounded-bl-sm"
                        )}>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <p className={cn(
                            "text-xs mt-1",
                            isOwn ? "text-emerald-100" : "text-slate-400"
                          )}>
                            {format(new Date(msg.createdAt), 'p')}
                            {isOwn && msg.status === 'READ' && ' • Read'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-200">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!messageContent.trim() || sending}
                  size="icon"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
