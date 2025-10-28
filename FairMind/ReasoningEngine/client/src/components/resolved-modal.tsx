import { type Resolution } from '@shared/schema';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home } from 'lucide-react';

interface ResolvedModalProps {
  resolution: Resolution;
  onClose: () => void;
}

export function ResolvedModal({ resolution, onClose }: ResolvedModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-16 h-16 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Dispute Resolved!</DialogTitle>
          <DialogDescription className="text-base">
            Both of you agreed on a resolution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          <div className="p-4 rounded-lg bg-card border border-card-border">
            <h4 className="font-semibold mb-2">{resolution.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {resolution.description}
            </p>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            This resolution has been saved to your history
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onClose}
            className="w-full"
            data-testid="button-back-to-dashboard"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
