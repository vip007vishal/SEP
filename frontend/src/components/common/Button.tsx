
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', type = 'button', ...props }) => {
    // Define base classes and conditional classes for size and variant
    const baseClasses = 'font-bold rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center';
    
    const sizeClasses = {
        sm: 'py-1 px-3 text-sm',
        md: 'py-2 px-4',
        lg: 'py-3 px-6 text-lg',
    };

    const variantClasses = {
        primary: 'bg-violet-600 text-white hover:bg-violet-700 shadow-md',
        secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
        danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md',
        outline: 'border-2 border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
    };

    return (
        <button type={type} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;
