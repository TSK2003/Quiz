import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { auth, db } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { BackButton } from '../ui/BackButton';

import logo from '../../assets/hero1.png';

export const EventAdminLayout: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackButton className="mr-2" />
            <Link to="/admin/dashboard" className="flex items-center gap-4">
              <img src={logo} alt="AESCION Logo" className="h-10 w-auto" />
              <span className="text-xl font-bold border-l border-border pl-4">Events</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-md font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-md">{eventName}</span>
            <span className="text-md font-bold">Admin: {user?.name}</span>
            <button onClick={handleLogout} className="text-md font-medium text-destructive hover:underline hover:cursor-pointer">Logout</button>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-card border-r border-border hidden md:block overflow-y-auto">
          <nav className="p-4 space-y-2">
            <Link to={`/admin/events/${eventId}/dashboard`} className="block p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium cursor-pointer">Event Overview</Link>
            <Link to={`/admin/events/${eventId}/users`} className="block p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium cursor-pointer">Users & Approvals</Link>
            <Link to={`/admin/events/${eventId}/courses`} className="block p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium cursor-pointer">Courses</Link>
            <Link to={`/admin/events/${eventId}/quizzes`} className="block p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium cursor-pointer">Quizzes</Link>
            <Link to={`/admin/events/${eventId}/audit-logs`} className="block p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm font-medium cursor-pointer">Audit Logs</Link>
          </nav>
        </aside>
        <main className="flex-1 p-6 overflow-y-auto bg-muted/10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
