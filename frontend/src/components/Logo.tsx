import React from 'react';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
    const sizeClasses = {
        sm: 'h-10 w-10',
        md: 'h-14 w-14',
        lg: 'h-20 w-20'
    };

    return (
        <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                {/* Background circle */}
                <circle cx="50" cy="50" r="48" className="fill-blue-600" />
                
                {/* I letter */}
                <path
                    d="M32 25 L32 75"
                    stroke="white"
                    strokeWidth="10"
                    strokeLinecap="round"
                />
                
                {/* B letter */}
                <path
                    d="M52 25 L52 75"
                    stroke="white"
                    strokeWidth="10"
                    strokeLinecap="round"
                />
                {/* Top curve of B */}
                <path
                    d="M52 25 Q65 25 65 37.5 Q65 50 52 50"
                    stroke="white"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                />
                {/* Bottom curve of B */}
                <path
                    d="M52 50 Q65 50 65 62.5 Q65 75 52 75"
                    stroke="white"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                />
            </svg>
        </div>
    );
};

export default Logo; 