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

  console.log('🔧 LogoutButton: Render - signOut available:', !!signOut, 'signOutAllSessions available:', !!signOutAllSessions);

  const handleLogout = async (scope: 'local' | 'global' = 'global') => {
    console.log('🚪 LogoutButton: handleLogout called with scope:', scope);
    console.log('🚪 LogoutButton: Functions available - signOut:', !!signOut, 'signOutAllSessions:', !!signOutAllSessions);
    
    try {
      setLoading(true);
      console.log('🚪 LogoutButton: Starting logout with scope:', scope);
      
      if (scope === 'global') {
        console.log('🚪 LogoutButton: Calling signOutAllSessions...');
        await signOutAllSessions();
      } else {
        console.log('🚪 LogoutButton: Calling signOut...');
        await signOut(scope);
      }
      
      console.log('✅ LogoutButton: Logout completed successfully');
    } catch (error) {
      console.error('❌ LogoutButton: Logout error:', error);
      toast.error("Failed to log out. Please try again.");
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
      onClick={() => {
        console.log('🚪 LogoutButton: Button clicked - calling handleLogout');
        handleLogout();
      }}
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