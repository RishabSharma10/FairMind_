import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Users, CheckCircle, Clock, LogOut, Trash2 } from 'lucide-react';
import { type Room } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });

  const { data: stats } = useQuery<{
    totalArguments: number;
    resolvedCount: number;
    resolutionsToday: number;
  }>({
    queryKey: ['/api/stats'],
  });

  const createRoomMutation = useMutation({
    mutationFn: () => apiRequest<Room>('POST', '/api/rooms', {}),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Room created!',
        description: `Share code: ${room.code}`,
      });
      setLocation(`/room/${room.id}`);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create room',
        description: error.message,
      });
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: (code: string) => apiRequest<Room>('POST', '/api/rooms/join', { code }),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      setIsJoinDialogOpen(false);
      setJoinCode('');
      setLocation(`/room/${room.id}`);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to join room',
        description: error.message,
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest<{ message: string }>('DELETE', '/api/user/delete', {}),
    onSuccess: () => {
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been removed.',
      });
      logout();
      setLocation('/');
    },
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate();
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      joinRoomMutation.mutate(joinCode.trim().toUpperCase());
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">FairMind</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Arguments</CardDescription>
              <CardTitle className="text-3xl">{stats?.totalArguments || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Resolved</CardDescription>
              <CardTitle className="text-3xl">{stats?.resolvedCount || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Resolutions Today</CardDescription>
              <CardTitle className="text-3xl">
                {stats?.resolutionsToday || 0}
                <span className="text-sm text-muted-foreground ml-2">/ 3</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" data-testid="button-create-room">
                <Plus className="w-5 h-5 mr-2" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Room</DialogTitle>
                <DialogDescription>
                  Start a new argument resolution session. You'll receive a code to share with the other person.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Button
                  onClick={handleCreateRoom}
                  disabled={createRoomMutation.isPending}
                  className="w-full"
                  data-testid="button-confirm-create"
                >
                  {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline" data-testid="button-join-room">
                <Users className="w-5 h-5 mr-2" />
                Join Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Room</DialogTitle>
                <DialogDescription>
                  Enter the 6-character room code to join an existing session.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="h-12 text-center text-lg font-mono"
                  data-testid="input-room-code"
                />
                <Button
                  type="submit"
                  disabled={joinRoomMutation.isPending || !joinCode.trim()}
                  className="w-full"
                  data-testid="button-confirm-join"
                >
                  {joinRoomMutation.isPending ? 'Joining...' : 'Join Room'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Room History */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Rooms</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : rooms && rooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/room/${room.id}`)}
                  data-testid={`card-room-${room.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Room {room.code}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          {room.status === 'resolved' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Resolved
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Active
                            </>
                          )}
                        </CardDescription>
                      </div>
                      {room.status === 'resolved' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created {formatDistanceToNow(new Date(room.createdAt), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No rooms yet</p>
                <p className="text-sm text-muted-foreground">Create or join a room to get started</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure? This action cannot be undone.')) {
                  deleteAccountMutation.mutate();
                }
              }}
              data-testid="button-delete-account"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
