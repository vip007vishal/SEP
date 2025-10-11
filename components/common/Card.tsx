import React, { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ children, className = '', ...props }, ref) => {
    return (
        <div ref={ref} className={`bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-none dark:border dark:border-slate-700 overflow-hidden p-6 sm:p-8 ${className}`} {...props}>
            {children}
        </div>
    );
});

Card.displayName = 'Card';

export default Card;