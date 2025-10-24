import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';
import { SearchIcon, BellIcon, MenuIcon } from '../ui/Icons';
import Button from '../ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentLink = NAV_LINKS.find(link => link.path === location.pathname);
  const pageTitle = currentLink ? currentLink.name : 'Dashboard';

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    
    // Redirect to login page
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b-2 border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center">
        <button onClick={onMenuClick} className="text-gray-500 focus:outline-none lg:hidden">
          <MenuIcon className="w-6 h-6" />
        </button>
        <h1 className="ml-4 text-2xl font-semibold text-gray-800 dark:text-white">{pageTitle}</h1>
      </div>

      <div className="flex items-center">
        <div className="relative mr-4 hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="w-5 h-5 text-gray-400" />
          </span>
          <input
            type="text"
            className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring focus:ring-opacity-40 focus:ring-blue-400"
            placeholder="Search"
          />
        </div>
        
        <button className="p-2 text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 focus:outline-none">
          <BellIcon className="w-6 h-6" />
        </button>

        <div className="relative ml-4">
          <img
            className="w-10 h-10 rounded-full object-cover"
            src="https://picsum.photos/100"
            alt="User avatar"
          />
        </div>

        <Button
          onClick={() => navigate('/teacher-login')}
          variant="secondary"
          className="ml-4 text-sm"
        >
          Teacher Login
        </Button>

        <button
          onClick={handleLogout}
          className="ml-4 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;