import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface NavigationProps {
  transparent?: boolean;
}

export default function Navigation({ transparent = false }: NavigationProps) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Define navigation items
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Cloud Analysis', href: '/cloud-analysis' },
    { name: 'Cloud History', href: '/cloud-history' },
    { name: 'Settings', href: '/settings' },
    { name: 'Docs', href: 'https://github.com/the-pocket/PocketFlow', external: true }
  ];

  // Determine if a nav item is active
  const isActive = (path: string): boolean => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  const bgColorClass = transparent && !isScrolled 
    ? 'bg-transparent' 
    : 'bg-white shadow-sm';

  const textColorClass = transparent && !isScrolled
    ? 'text-white'
    : 'text-gray-800';

  // Always keep logo text visible regardless of background
  const logoColorClass = 'text-white';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${bgColorClass}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <div className="bg-wf-red px-3 py-1 rounded">
                <span className="font-bold text-xl tracking-tight text-white">CloudView</span>
              </div>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
            {navItems.map((item) => 
              item.external ? (
                <a 
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${textColorClass} hover:text-wf-red px-3 py-2 text-sm font-medium transition-colors duration-200`}
                >
                  {item.name}
                </a>
              ) : (
                <Link 
                  key={item.name}
                  href={item.href}
                  className={`${isActive(item.href) ? 'text-wf-red font-semibold' : textColorClass} 
                  hover:text-wf-red px-3 py-2 text-sm font-medium transition-colors duration-200`}
                >
                  {item.name}
                </Link>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button 
              type="button" 
              className={`${textColorClass} p-2 rounded-md focus:outline-none`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => 
              item.external ? (
                <a 
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-800 hover:text-wf-red block px-4 py-2 text-base font-medium"
                >
                  {item.name}
                </a>
              ) : (
                <Link 
                  key={item.name}
                  href={item.href}
                  className={`${isActive(item.href) ? 'text-wf-red bg-gray-50' : 'text-gray-800'} 
                  hover:text-wf-red block px-4 py-2 text-base font-medium`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 