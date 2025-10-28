import { type Resolution } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';

interface ResolutionPanelProps {
  resolutions: Resolution[];
  isGenerating: boolean;
  myVote: string | null;
  otherVote: string | null;
  onVote: (resolutionId: string) => void;
}

export function ResolutionPanel({
  resolutions,
  isGenerating,
  myVote,
  otherVote,
  onVote,
}: ResolutionPanelProps) {
  if (isGenerating) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center mb-6">
          <Sparkles className="w-8 h-8 mx-auto text-primary mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">AI is analyzing your conversation...</p>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </CardHeader>
            <CardContent>
              <div className="h-2 bg-muted rounded w-full mb-4" />
              <div className="h-10 bg-muted rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (resolutions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Exchange at least 4 messages</p>
          <p className="text-xs mt-1">Then generate AI resolutions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">AI-Generated Resolutions</h3>
        <p className="text-sm text-muted-foreground">Choose the option that works best</p>
      </div>

      {resolutions.map((resolution) => {
        const isMyVote = myVote === resolution.id;
        const isOtherVote = otherVote === resolution.id;
        const bothVoted = isMyVote && isOtherVote;

        return (
          <Card
            key={resolution.id}
            className={`${bothVoted ? 'border-4 border-primary' : isMyVote ? 'border-2 border-primary' : ''}`}
            data-testid={`card-resolution-${resolution.id}`}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{resolution.title}</CardTitle>
                {resolution.suggestedBest && (
                  <Badge variant="default" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Recommended
                  </Badge>
                )}
              </div>
              <CardDescription className="leading-relaxed">
                {resolution.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">AI Confidence</span>
                  <span className="font-medium">{resolution.aiScore}%</span>
                </div>
                <Progress value={resolution.aiScore} className="h-2" />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => onVote(resolution.id)}
                  disabled={!!myVote}
                  className="flex-1"
                  variant={isMyVote ? 'default' : 'outline'}
                  data-testid={`button-vote-${resolution.id}`}
                >
                  {isMyVote ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Your Choice
                    </>
                  ) : (
                    'Select This'
                  )}
                </Button>
                {isOtherVote && (
                  <Badge variant="secondary" className="text-xs">
                    Other voted
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
