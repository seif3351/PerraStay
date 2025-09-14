import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Globe, Menu, User, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";
import logoPngPath from "@assets/035EA920-1957-4A32-8948-7A535AFA0113_1755437763078.png";

export default function Header() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const { toast } = useToast();

  // Check authentication status on mount and when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('user');
        setUser(userData ? JSON.parse(userData) : null);
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        localStorage.removeItem('user'); // Clear corrupted data
        setUser(null);
      }
    };

    checkAuth();
    
    // Listen for storage changes (in case user signs in/out in another tab)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/signout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Clear localStorage
        localStorage.removeItem('user');
        setUser(null);
        setIsMenuOpen(false);
        
        toast({
          title: 'Signed out successfully',
          description: 'You have been signed out of your account.',
        });
        
        // Redirect to home page
        setLocation('/');
      } else {
        throw new Error('Sign out failed');
      }
    } catch (error) {
      toast({
        title: 'Sign out failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <img src={logoPngPath} alt="Perra Logo" className="h-10 w-10" />
            <span className="text-2xl font-heading font-bold text-perra-dark">Perra</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/search" className={`text-perra-gray hover:text-perra-gold transition-colors ${location === '/search' ? 'text-perra-gold' : ''}`}>
              Browse Homes
            </Link>
            <Link href="/host-dashboard" className={`text-perra-gray hover:text-perra-gold transition-colors ${location === '/host-dashboard' ? 'text-perra-gold' : ''}`}>
              Become a Host
            </Link>
            <Link href="#delivery" className="text-perra-gray hover:text-perra-gold transition-colors">
              Delivery
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="text-perra-gray hover:text-perra-gold transition-colors">
              <Globe className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                className="flex items-center space-x-2 border border-gray-300 rounded-full p-2 hover:shadow-lg transition-all"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <Menu className="w-4 h-4 text-perra-gray" />
                <User className="w-5 h-5 text-perra-gray" />
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                  {user ? (
                    // Authenticated user menu
                    <>
                      <div className="px-4 py-2 text-sm text-perra-gray border-b border-gray-100">
                        <div className="font-medium text-perra-dark">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs">{user.email}</div>
                      </div>
                      
                      <Link 
                        href={user.isHost ? "/host-dashboard" : "/guest-dashboard"}
                        className="block px-4 py-2 text-sm text-perra-gray hover:bg-gray-50 hover:text-perra-gold"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {user.isHost ? "Host Dashboard" : "Guest Dashboard"}
                      </Link>
                      
                      {user.isHost && (
                        <Link 
                          href="/guest-dashboard"
                          className="block px-4 py-2 text-sm text-perra-gray hover:bg-gray-50 hover:text-perra-gold"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Guest Dashboard
                        </Link>
                      )}
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-perra-gray hover:bg-gray-50 hover:text-perra-gold"
                        data-testid="button-signout"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    // Unauthenticated user menu
                    <>
                      <Link 
                        href="/guest-dashboard"
                        className="block px-4 py-2 text-sm text-perra-gray hover:bg-gray-50 hover:text-perra-gold"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Guest Dashboard
                      </Link>
                      <Link 
                        href="/host-dashboard"
                        className="block px-4 py-2 text-sm text-perra-gray hover:bg-gray-50 hover:text-perra-gold"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Host Dashboard
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      <Link 
                        href="/auth"
                        className="block w-full text-left px-4 py-2 text-sm text-perra-gray hover:bg-gray-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link 
                        href="/auth?mode=signup"
                        className="block w-full text-left px-4 py-2 text-sm text-perra-gray hover:bg-gray-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
