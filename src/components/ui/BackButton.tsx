import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

export const BackButton: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate();

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => navigate(-1)} 
      className={`gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 ${className || ''}`}
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </Button>
  );
};
