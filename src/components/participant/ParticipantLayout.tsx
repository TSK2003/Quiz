import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import { BackButton } from '../ui/BackButton';
import logo from '../../assets/hero1.png';

export const ParticipantLayout: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'participant') {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <BackButton className="mr-2" />
          <img src={logo} alt="AESCION Logo" className="h-10 w-auto" />
          <span className="text-md font-bold text-2xl mx-4">Welcome Back, {user?.name}</span>
        </div> 
        <div className="items-center gap-4">
          <button onClick={handleLogout} className="text-md font-medium text-destructive hover:underline hover:cursor-pointer text-xl">Logout</button>
        </div>
      </header>
      <main className="flex-1 p-6 flex flex-col max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};
