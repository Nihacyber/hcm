import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';
import { HcmsLogo, CloseIcon } from '../ui/Icons';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const NavLinks = () => (
  <nav className="mt-6">
    {NAV_LINKS.map((link) => (
      <NavLink
        key={link.name}
        to={link.path}
        className={({ isActive }) =>
          `flex items-center px-4 py-3 my-1 text-gray-100 transition-colors duration-200 transform rounded-md hover:bg-primary-700 ${
            isActive ? 'bg-primary-700 font-bold' : ''
          }`
        }
      >
        {link.icon}
        <span className="mx-4 font-medium">{link.name}</span>
      </NavLink>
    ))}
  </nav>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  return (
    <>
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-30 transition-opacity bg-black bg-opacity-50 lg:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={() => setIsOpen(false)}></div>
      
      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 px-4 py-7 overflow-y-auto bg-primary-900 transform lg:hidden transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <HcmsLogo className="w-10 h-10 text-white" />
            <span className="ml-2 text-2xl font-bold text-white">HCMS</span>
          </div>
          <button className="text-gray-400 hover:text-white" onClick={() => setIsOpen(false)}>
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <NavLinks />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-primary-900">
            <div className="flex items-center flex-shrink-0 px-4">
              <HcmsLogo className="w-10 h-10 text-white" />
              <span className="ml-2 text-2xl font-bold text-white">HCMS</span>
            </div>
            <NavLinks />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;