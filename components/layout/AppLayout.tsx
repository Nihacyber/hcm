import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import PageWrapper from './PageWrapper';

interface AppLayoutProps {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, isSidebarOpen, setSidebarOpen }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <PageWrapper>
            {children}
          </PageWrapper>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;