import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    containerClassName?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, containerClassName = '', ...props }) => {
    return (
        <div className={containerClassName}>
            {label && <label htmlFor={id} className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>}
            <textarea
                id={id}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400 dark:focus:ring-violet-400 dark:focus:border-violet-400"
                rows={4}
                {...props}
            />
        </div>
    );
};

export default Textarea;
