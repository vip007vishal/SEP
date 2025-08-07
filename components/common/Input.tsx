
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    containerClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, id, containerClassName = '', ...props }) => {
    return (
        <div className={containerClassName}>
            {label && <label htmlFor={id} className="block text-sm font-medium text-slate-600 mb-1">{label}</label>}
            <input
                id={id}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                {...props}
            />
        </div>
    );
};

export default Input;
