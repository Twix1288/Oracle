import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  showText?: boolean;
  showDropdown?: boolean;
  className?: string;
}

export const LogoutButton = ({ 
  variant = 'destructive', 
  size = 'sm', 
  showIcon = true, 
  showText = true,
  showDropdown = false,
  className = '' 
}: LogoutButtonProps) => {
  const { signOut, signOutAllSessions } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async (scope: 'local' | 'global' = 'global') => {
    try {
      setLoading(true);
      if (scope === 'global') {
        await signOutAllSessions();
      } else {
        await signOut('local');
        toast.success("Logged out from this device");
      }
      navigate('/auth');
    } catch (error) {
      toast.error("Failed to log out");
    } finally {
      setLoading(false);
    }
  };

  if (showDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant}
            size={size}
            className={className}
            disabled={loading}
          >
            {showIcon && <LogOut className="w-4 h-4" />}
            {showIcon && showText && <span className="ml-2" />}
            {showText && "Logout"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleLogout('local')}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out this device
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleLogout('global')}>
            <Shield className="mr-2 h-4 w-4" />
            Sign out all devices
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button 
      onClick={() => handleLogout()}
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
      title="Sign out of your account"
    >
      {showIcon && <LogOut className="w-4 h-4" />}
      {showIcon && showText && <span className="ml-2" />}
      {showText && "Logout"}
    </Button>
  );
};