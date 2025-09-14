import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Globe, Menu, User } from "lucide-react";
import logoPngPath from "@assets/035EA920-1957-4A32-8948-7A535AFA0113_1755437763078.png";

export default function Header() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                    href="/auth"
                    className="block w-full text-left px-4 py-2 text-sm text-perra-gray hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
