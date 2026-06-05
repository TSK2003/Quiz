import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';

import { BackButton } from '../ui/BackButton';
import logo from '../../assets/hero1.png';

export const AdminLayout: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/participant/dashboard');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackButton className="mr-2" />
            <img src={logo} alt="AESCION Logo" className="h-15 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-md font-bold">{user?.name}</span>
            <button onClick={handleLogout} className="text-md font-medium text-destructive hover:underline hover:cursor-pointer">Logout</button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6 overflow-y-auto bg-muted/10">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
