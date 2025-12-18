import { Link } from 'react-router-dom';
import { Activity, User, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { getProfile, logout } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function Header() {
  const profile = getProfile();
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-reports', profile?.sub],
    queryFn: async () => {
      if (profile?.role !== 'patient' || !profile?.patient_id) return 0;
      try {
        const { data } = await api.get<any[]>(`/patients/${profile.patient_id}/reports`);
        return data.filter(r => r.reviewed && !r.patient_read).length;
      } catch (e) {
        return 0;
      }
    },
    enabled: !!profile && profile.role === 'patient',
    refetchInterval: 30000 // Poll every 30 seconds
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Healio.AI
          </span>
        </Link>

        <nav className="flex items-center space-x-4">
          {profile && (
            <>
              {profile.role === 'patient' && (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/chat/new">New Chat</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/chat/history">Chat History</Link>
                  </Button>
                  <Button variant="ghost" asChild className="relative">
                    <Link to="/reports">
                      My Reports
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/history">Medical History</Link>
                  </Button>
                </>
              )}

              {(profile.role === 'doctor' || profile.role === 'admin') && (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/doctor/reports">Review Reports</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/doctor/approved">Approved Reports</Link>
                  </Button>
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {profile.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
