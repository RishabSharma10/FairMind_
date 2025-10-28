import { useEffect, useRef } from 'react';
import { type Message } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { Mic, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageListProps {
  messages: (Message & { senderName: string })[];
  isOwn: boolean;
}

export function MessageList({ messages, isOwn }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePlayAudio = (voiceUrl: string) => {
    const audio = new Audio(voiceUrl);
    audio.play();
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          data-testid={`message-${message.id}`}
        >
          <div
            className={`max-w-[80%] ${
              isOwn
                ? 'bg-primary text-primary-foreground rounded-l-2xl rounded-tr-2xl'
                : 'bg-card border border-card-border rounded-r-2xl rounded-tl-2xl'
            } p-4`}
          >
            {message.isVoice ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  <span className="text-sm font-medium">Voice Message</span>
                </div>
                {message.voiceUrl && (
                  <Button
                    size="sm"
                    variant={isOwn ? 'secondary' : 'outline'}
                    onClick={() => handlePlayAudio(message.voiceUrl!)}
                    data-testid={`button-play-audio-${message.id}`}
                  >
                    <Volume2 className="w-3 h-3 mr-1" />
                    Play
                  </Button>
                )}
                {message.transcript && (
                  <p className="text-sm italic opacity-90 mt-2">"{message.transcript}"</p>
                )}
              </div>
            ) : (
              <p className="text-base leading-relaxed whitespace-pre-wrap">{message.text}</p>
            )}
            <p
              className={`text-xs mt-2 ${
                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}
            >
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
