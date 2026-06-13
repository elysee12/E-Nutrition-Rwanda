import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, ArrowLeft, MessageCircle, Trash2, User, Building2 } from 'lucide-react';
import { api, type Conversation, type Message, type User as ApiUser } from '@/lib/api';
import { toast } from 'sonner';
import { useRole, ROLE_LABEL, getStoredUser } from '@/lib/role';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatDialog({ open, onOpenChange }: ChatDialogProps) {
  const role = useRole();
  const currentUser = getStoredUser();
  const isAdmin = role?.toLowerCase() === 'admin';
  
  const [view, setView] = useState<'list' | 'chat' | 'users'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Partial<ApiUser>[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch conversations on open
  useEffect(() => {
    if (open) {
      fetchConversations();
      // Refresh conversations every 10 seconds
      const interval = setInterval(fetchConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [open]);

  // Auto-scroll to bottom when messages change
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
      console.log('Available users:', users);
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
      
      // Mark as read
      if (conversation.unreadCount > 0) {
        await api.markConversationAsRead(conversation.id);
        fetchConversations(); // Refresh to update unread count
      }
      
      setView('chat');
    } catch (err) {
      console.error('Failed to load messages', err);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async (user: Partial<ApiUser>) => {
    try {
      console.log('Starting chat with user:', user);
      
      // Validate user has an ID
      if (!user.id) {
        toast.error('Invalid user selected. Please try again.');
        return;
      }
      
      // Check if conversation already exists
      const existing = conversations.find(
        c => c.otherParticipant.id === user.id
      );
      
      if (existing) {
        openConversation(existing);
        return;
      }

      // Create a temporary conversation
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
      
      console.log('Created temp conversation:', tempConversation);
      setSelectedConversation(tempConversation);
      setMessages([]);
      setView('chat');
    } catch (err) {
      console.error('Failed to start chat', err);
      toast.error('Failed to start chat');
    }
  };

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const recipientId = selectedConversation.otherParticipant.id;
      
      // Validate recipientId
      if (!recipientId) {
        toast.error('Invalid recipient. Please select a user again.');
        setView('list');
        return;
      }
      
      console.log('Sending message to recipientId:', recipientId);
      const message = await api.sendMessage(recipientId, messageContent.trim());
      
      setMessages(prev => [...prev, message]);
      setMessageContent('');
      
      // Refresh conversations to update last message
      fetchConversations();
      
      // If this was a new conversation, update the selected conversation ID
      if (selectedConversation.id === 'new') {
        const conversations = await api.getConversations();
        const newConv = conversations.find(c => c.otherParticipant.id === recipientId);
        if (newConv) {
          setSelectedConversation(newConv);
        }
      }
    } catch (err: any) {
      console.error('Failed to send message', err);
      const errorMsg = err?.message || err?.data?.message || 'Failed to send message';
      toast.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await api.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      setView('list');
      toast.success('Conversation deleted');
    } catch (err) {
      console.error('Failed to delete conversation', err);
      toast.error('Failed to delete conversation');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderListView = () => (
    <>
      <DialogHeader className="pb-4 border-b">
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <span>Messages</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              fetchAvailableUsers();
              setView('users');
            }}
          >
            <User className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </DialogTitle>
      </DialogHeader>
      
      <ScrollArea className="h-[500px] px-1">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-2">
              Start a new chat to get in touch with {isAdmin ? 'staff members' : 'administrators'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-accent group",
                  conv.unreadCount > 0 && "bg-accent/50"
                )}
              >
                <Avatar className="h-10 w-10 ring-2 ring-background">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                    {getInitials(conv.otherParticipant.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm truncate">
                      {conv.otherParticipant.name}
                    </h4>
                    {conv.unreadCount > 0 && (
                      <Badge variant="default" className="ml-2 bg-emerald-600 text-white">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-medium">{ROLE_LABEL[conv.otherParticipant.role.toLowerCase()]}</span>
                    {conv.otherParticipant.facility && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {conv.otherParticipant.facility.name}
                        </span>
                      </>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage || 'No messages yet'}
                  </p>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  const renderUsersView = () => (
    <>
      <DialogHeader className="pb-4 border-b">
        <DialogTitle className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setView('list')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <User className="h-5 w-5 text-primary" />
          <span>Select {isAdmin ? 'Staff Member' : 'Administrator'}</span>
        </DialogTitle>
      </DialogHeader>
      
      <ScrollArea className="h-[500px] px-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : availableUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <User className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">No users available</p>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {availableUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => startNewChat(user)}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-accent"
              >
                <Avatar className="h-10 w-10 ring-2 ring-background">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                    {getInitials(user.name!)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">{user.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{ROLE_LABEL[user.role!.toLowerCase()]}</span>
                    {(user as any).facility && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {(user as any).facility.name}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  const renderChatView = () => (
    <>
      <DialogHeader className="pb-4 border-b">
        <DialogTitle className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setView('list')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8 ring-2 ring-background">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
              {selectedConversation && getInitials(selectedConversation.otherParticipant.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">
              {selectedConversation?.otherParticipant.name}
            </h4>
            <p className="text-xs text-muted-foreground">
              {selectedConversation && ROLE_LABEL[selectedConversation.otherParticipant.role.toLowerCase()]}
            </p>
          </div>
        </DialogTitle>
      </DialogHeader>
      
      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <ScrollArea className="h-[400px] px-4" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[350px] text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Start the conversation by sending a message below
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
                        <div className="flex items-center justify-center my-4">
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(msg.createdAt), 'PPP')}
                          </Badge>
                        </div>
                      )}
                      
                      <div className={cn(
                        "flex gap-2",
                        isOwn ? "justify-end" : "justify-start"
                      )}>
                        <div className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2 shadow-sm",
                          isOwn 
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white" 
                            : "bg-accent"
                        )}>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <p className={cn(
                            "text-xs mt-1",
                            isOwn ? "text-emerald-100" : "text-muted-foreground"
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
          </ScrollArea>

          <div className="p-4 border-t">
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
                placeholder="Type your message..."
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
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <div className="p-6">
          {view === 'list' && renderListView()}
          {view === 'users' && renderUsersView()}
          {view === 'chat' && renderChatView()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
