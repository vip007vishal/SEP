import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'black' | 'lavender' | 'lightblue' | 'limegreen' | 'lightred' | 'lightyellow' | 'lightpink' | 'lightindigo';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            return storedTheme as Theme;
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('dark', 'black', 'lavender', 'lightblue', 'limegreen', 'lightred', 'lightyellow', 'lightpink', 'lightindigo'); // Remove all theme classes first

        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'black') {
            root.classList.add('dark', 'black'); // Add both for overrides
        } else if (theme === 'lavender') {
            root.classList.add('lavender');
        } else if (theme === 'lightblue') {
            root.classList.add('lightblue');
        } else if (theme === 'limegreen') {
            root.classList.add('limegreen');
        } else if (theme === 'lightred') {
            root.classList.add('lightred');
        } else if (theme === 'lightyellow') {
            root.classList.add('lightyellow');
        } else if (theme === 'lightpink') {
            root.classList.add('lightpink');
        } else if (theme === 'lightindigo') {
            root.classList.add('lightindigo');
        }
        
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => {
            if (prevTheme === 'light') return 'dark';
            if (prevTheme === 'dark') return 'black';
            if (prevTheme === 'black') return 'lavender';
            if (prevTheme === 'lavender') return 'lightblue';
            if (prevTheme === 'lightblue') return 'limegreen';
            if (prevTheme === 'limegreen') return 'lightred';
            if (prevTheme === 'lightred') return 'lightyellow';
            if (prevTheme === 'lightyellow') return 'lightpink';
            if (prevTheme === 'lightpink') return 'lightindigo';
            return 'light'; // from 'lightindigo'
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};