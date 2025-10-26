import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import type { Message, User } from "@shared/schema";

interface MessageWithSender extends Message {
  sender?: User;
}

interface BookingChatProps {
  bookingId: string;
  currentUserId: string;
  guestName: string;
  hostName: string;
}

export function BookingChat({
  bookingId,
  currentUserId,
  guestName,
  hostName
}: BookingChatProps) {
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages with polling (every 3 seconds)
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/bookings/${bookingId}/messages`],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${bookingId}/messages`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log('=== SENDING MESSAGE ===');
      console.log('Booking ID:', bookingId);
      console.log('Content:', content);
      
      // Fetch CSRF token
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      const { csrfToken } = await csrfResponse.json();
      
      const response = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const error = await response.json();
        console.error('Server error:', error);
        throw new Error(error.message || 'Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}/messages`] });
      setMessageContent("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = messageContent.trim();
    if (!trimmed || sendMessageMutation.isPending) return;
    
    if (trimmed.length > 1000) {
      toast({
        title: "Message too long",
        description: "Maximum 1000 characters allowed",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate(trimmed);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-perra-gray" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages list */}
        <div className="h-96 overflow-y-auto space-y-3 p-4 border rounded-lg bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="h-12 w-12 text-perra-gray mb-2" />
              <p className="text-perra-gray">No messages yet</p>
              <p className="text-sm text-perra-gray">Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isCurrentUser = message.senderId === currentUserId;
                const senderName = isCurrentUser ? "You" : (message.senderId === currentUserId ? guestName : hostName);
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isCurrentUser
                          ? 'bg-perra-gold text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <p className={`text-xs font-semibold mb-1 ${isCurrentUser ? 'text-white/90' : 'text-perra-gray'}`}>
                        {senderName}
                      </p>
                      <p className={`text-sm ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}>
                        {message.content}
                      </p>
                      <p className={`text-xs mt-1 ${isCurrentUser ? 'text-white/70' : 'text-perra-gray'}`}>
                        {message.createdAt && new Date(message.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 resize-none"
            rows={3}
            maxLength={1000}
          />
          <Button
            onClick={handleSend}
            disabled={!messageContent.trim() || sendMessageMutation.isPending}
            className="bg-perra-gold hover:bg-perra-gold/90"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Character count */}
        <p className="text-xs text-perra-gray text-right">
          {messageContent.length}/1000 characters
        </p>
      </CardContent>
    </Card>
  );
}
