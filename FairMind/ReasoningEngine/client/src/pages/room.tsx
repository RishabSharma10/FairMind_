import { useEffect, useState, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { type Room, type Message, type Resolution, type WSMessage } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, Mic, MicOff, Copy, ArrowLeft, Sparkles } from 'lucide-react';
import { MessageList } from '@/components/message-list';
import { ResolutionPanel } from '@/components/resolution-panel';
import { ResolvedModal } from '@/components/resolved-modal';
import { apiRequest } from '@/lib/queryClient';

export default function RoomPage() {
  const [, params] = useRoute('/room/:id');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const roomId = params?.id;

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<(Message & { senderName: string })[]>([]);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [otherUser, setOtherUser] = useState<{ id: string; name: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resolvedResolution, setResolvedResolution] = useState<Resolution | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [otherVote, setOtherVote] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { data: room } = useQuery<Room>({
    queryKey: ['/api/rooms', roomId],
    enabled: !!roomId,
  });

  useEffect(() => {
    if (!roomId || !user) return;

    // Load initial messages
    fetch(`/api/rooms/${roomId}/messages`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch(console.error);

    // Setup WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'join_room',
          roomId,
          userId: user.id,
          userName: user.name,
        })
      );
    };

    ws.onmessage = (event) => {
      const data: WSMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'user_joined':
          setOtherUser({ id: data.userId, name: data.userName });
          toast({
            title: 'User joined',
            description: `${data.userName} has joined the room`,
          });
          break;

        case 'user_left':
          setOtherUser(null);
          break;

        case 'new_message':
          setMessages((prev) => [...prev, data.message]);
          break;

        case 'resolutions_generated':
          setResolutions(data.resolutions);
          setIsGenerating(false);
          break;

        case 'vote_cast':
          if (data.userId !== user.id) {
            setOtherVote(data.resolutionId);
          }
          break;

        case 'room_resolved':
          setResolvedResolution(data.resolution);
          break;
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'leave_room',
            roomId,
            userId: user.id,
          })
        );
      }
      ws.close();
    };
  }, [roomId, user, toast]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !roomId) return;

    try {
      await apiRequest('POST', `/api/rooms/${roomId}/messages`, {
        text: message,
        isVoice: false,
      });
      setMessage('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to send message',
        description: error.message,
      });
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleSendVoiceMessage(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Microphone access denied',
        description: 'Please allow microphone access to record voice messages',
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendVoiceMessage = async (audioBlob: Blob) => {
    if (!roomId) return;

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');
    formData.append('roomId', roomId);

    try {
      await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to send voice message',
        description: error.message,
      });
    }
  };

  const handleGenerateResolutions = async () => {
    if (!roomId) return;

    setIsGenerating(true);
    try {
      await apiRequest('POST', `/api/rooms/${roomId}/generate-resolutions`, {});
    } catch (error: any) {
      setIsGenerating(false);
      toast({
        variant: 'destructive',
        title: 'Failed to generate resolutions',
        description: error.message,
      });
    }
  };

  const handleVote = async (resolutionId: string) => {
    if (!roomId) return;

    try {
      await apiRequest('POST', `/api/rooms/${roomId}/vote`, { resolutionId });
      setMyVote(resolutionId);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to vote',
        description: error.message,
      });
    }
  };

  const handleCopyCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.code);
      toast({
        title: 'Code copied!',
        description: 'Share this code with the other person',
      });
    }
  };

  if (!user || !room) {
    return null;
  }

  const myMessages = messages.filter((m) => m.senderId === user.id);
  const otherMessages = messages.filter((m) => m.senderId !== user.id);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Room {room.code}</h1>
              <p className="text-sm text-muted-foreground">
                {otherUser ? `With ${otherUser.name}` : 'Waiting for other person...'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            data-testid="button-copy-code"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Code
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_400px_1fr]">
          {/* Left Pane - My Messages */}
          <div className="border-r border-border flex flex-col">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-xs text-muted-foreground">You</div>
                </div>
              </div>
            </div>
            <MessageList messages={myMessages} isOwn={true} />
          </div>

          {/* Center Pane - Input & Resolutions */}
          <div className="flex flex-col">
            {/* Input Area */}
            <div className="p-6 border-b border-border">
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 h-12"
                    data-testid="input-message"
                  />
                  <Button type="submit" size="icon" className="h-12 w-12" data-testid="button-send">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex justify-center">
                  <Button
                    type="button"
                    size="icon"
                    variant={isRecording ? 'destructive' : 'outline'}
                    className="w-20 h-20 rounded-full"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    data-testid="button-record"
                  >
                    {isRecording ? (
                      <MicOff className="w-8 h-8" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </Button>
                </div>
              </form>
              {messages.length >= 4 && resolutions.length === 0 && !isGenerating && (
                <Button
                  onClick={handleGenerateResolutions}
                  className="w-full mt-4"
                  data-testid="button-generate-resolutions"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Resolutions
                </Button>
              )}
            </div>

            {/* Resolutions Area */}
            <div className="flex-1 overflow-y-auto">
              <ResolutionPanel
                resolutions={resolutions}
                isGenerating={isGenerating}
                myVote={myVote}
                otherVote={otherVote}
                onVote={handleVote}
              />
            </div>
          </div>

          {/* Right Pane - Other Person's Messages */}
          <div className="border-l border-border flex flex-col">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                {otherUser ? (
                  <>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold">
                        {otherUser.name.charAt(0)}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-status-online border-2 border-card" />
                    </div>
                    <div>
                      <div className="font-semibold">{otherUser.name}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                    <div>
                      <div className="font-semibold text-muted-foreground">Waiting...</div>
                      <div className="text-xs text-muted-foreground">Share room code</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <MessageList messages={otherMessages} isOwn={false} />
          </div>
        </div>
      </div>

      {/* Resolved Modal */}
      {resolvedResolution && (
        <ResolvedModal
          resolution={resolvedResolution}
          onClose={() => {
            setResolvedResolution(null);
            setLocation('/dashboard');
          }}
        />
      )}
    </div>
  );
}
