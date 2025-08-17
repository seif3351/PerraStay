import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import logoPngPath from "@assets/035EA920-1957-4A32-8948-7A535AFA0113_1755437763078.png";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img src={logoPngPath} alt="Perra Logo" className="h-8 w-8" />
              <span className="text-xl font-heading font-bold text-perra-dark">Perra</span>
            </div>
            <p className="text-perra-gray text-sm mb-4">
              Medium-term rentals with premium amenities and integrated services. From the ancient Egyptian words "per" (home) and "ra" (sun).
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-perra-dark mb-4">For Guests</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="text-perra-gray hover:text-perra-gold transition-colors">Browse Listings</Link></li>
              <li><a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">Booking Help</a></li>
              <li><a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">Delivery Services</a></li>
              <li><Link href="/guest-dashboard" className="text-perra-gray hover:text-perra-gold transition-colors">Guest Support</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-perra-dark mb-4">For Hosts</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/host-dashboard" className="text-perra-gray hover:text-perra-gold transition-colors">List Your Property</Link></li>
              <li><a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">Host Resources</a></li>
              <li><a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">Safety & Security</a></li>
              <li><a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">Host Community</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-perra-dark mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">About Perra</a></li>
              <li><a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">Careers</a></li>
              <li><a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">Press</a></li>
              <li><a href="#" className="text-perra-gray hover:text-perra-gold transition-colors">Investor Relations</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-perra-gray text-sm">
            © 2024 Perra, Inc. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-perra-gray hover:text-perra-gold transition-colors text-sm">Privacy Policy</a>
            <a href="#" className="text-perra-gray hover:text-perra-gold transition-colors text-sm">Terms of Service</a>
            <a href="#" className="text-perra-gray hover:text-perra-gold transition-colors text-sm">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
