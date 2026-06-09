import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { auth, db } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { BackButton } from '../ui/BackButton';
import { PageWrapper } from '../ui/PageWrapper';
import { Button } from '../ui/Button';
import { LogOut, LayoutDashboard, Users, BookOpen, PenTool, ShieldAlert, ClipboardCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

import logo from '../../assets/hero1.png';

export const EventAdminLayout: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId } = useParams<{ eventId: string }>();
  const [eventName, setEventName] = useState<string>('Loading Event...');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/participant/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      try {
        const docSnap = await getDoc(doc(db, 'events', eventId));
        if (docSnap.exists()) {
          setEventName(docSnap.data().name);
        } else {
          setEventName('Event Not Found');
        }
      } catch (err) {
        setEventName('Error Loading Event');
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Event Overview', path: `/admin/events/${eventId}/dashboard`, icon: LayoutDashboard },
    { name: 'Users & Approvals', path: `/admin/events/${eventId}/users`, icon: Users },
    { name: 'Courses', path: `/admin/events/${eventId}/courses`, icon: BookOpen },
    { name: 'Quizzes', path: `/admin/events/${eventId}/quizzes`, icon: PenTool },
    { name: 'Audit Logs', path: `/admin/events/${eventId}/audit-logs`, icon: ShieldAlert },
    { name: 'Participants Attendance', path: `/admin/events/${eventId}/attendance`, icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-border/50 supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div className="h-6 w-px bg-border hidden sm:block"></div>
            <Link to="/admin/dashboard" className="flex items-center gap-4 group">
              <img src={logo} alt="AESCION Logo" className="h-8 w-auto object-contain group-hover:opacity-80 transition-opacity" />
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-bold leading-none">Events</span>
                <span className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">{eventName}</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full hidden md:inline-block border border-primary/20">
              {eventName}
            </span>
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-bold leading-none">{user?.name}</span>
              <span className="text-xs text-muted-foreground mt-1">Administrator</span>
            </div>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-2">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
        <aside className="w-64 bg-card/50 backdrop-blur-sm border-r border-border/50 hidden md:block overflow-y-auto">
          <nav className="p-4 space-y-1">
            <div className="mb-4 px-2">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Event Menu</h2>
            </div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto relative">
          <PageWrapper>
            <Outlet />
          </PageWrapper>
        </main>
      </div>
    </div>
  );
};
