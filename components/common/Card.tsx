import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`bg-white rounded-xl shadow-md overflow-hidden p-6 sm:p-8 ${className}`} {...props}>
            {children}
        </div>
    );
};

export default Card;