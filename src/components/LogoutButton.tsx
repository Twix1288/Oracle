import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface LogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export const LogoutButton = ({ 
  variant = 'destructive', 
  size = 'sm', 
  showIcon = true, 
  showText = true,
  className = '' 
}: LogoutButtonProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate('/auth');
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  return (
    <Button 
      onClick={handleLogout}
      variant={variant}
      size={size}
      className={className}
      title="Sign out of your account"
    >
      {showIcon && <LogOut className="w-4 h-4" />}
      {showIcon && showText && <span className="ml-2" />}
      {showText && "Logout"}
    </Button>
  );
};