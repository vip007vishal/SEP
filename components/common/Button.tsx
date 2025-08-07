
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
    className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100';
    
    const variantClasses = {
        primary: 'bg-violet-600 text-white hover:bg-violet-700 shadow-md',
        secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
        danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md',
    };

    return (
        <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;
