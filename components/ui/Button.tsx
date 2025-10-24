import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = "px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform rounded-md focus:outline-none focus:ring focus:ring-opacity-80";

  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-400',
    secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-400',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;