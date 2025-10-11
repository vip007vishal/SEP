import React from 'react';

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = 'h-8 w-8', ...props }) => {
    // This component now renders a static PNG image as the logo.
    // The theme-aware color changing has been removed.
    return (
        <img
            src="images/sep logo.png"
            alt="Smart Exam Planner Logo"
            className={`object-contain ${className}`}
            {...props}
        />
    );
};

export default Logo;