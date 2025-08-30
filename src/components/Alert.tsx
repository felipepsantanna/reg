// components/Alert.tsx

import React from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

// Se não tiver o react-icons instalado, execute:
// npm install react-icons

interface AlertProps {
    type: 'success' | 'error' | 'info';
    message: string;
}

const Alert: React.FC<AlertProps> = ({ type, message }) => {
    let icon;
    let bgColor;
    let borderColor;
    let textColor;

    switch (type) {
        case 'success':
            icon = <FaCheckCircle />;
            bgColor = 'bg-green-100';
            borderColor = 'border-green-400';
            textColor = 'text-green-700';
            break;
        case 'error':
            icon = <FaExclamationCircle />;
            bgColor = 'bg-red-100';
            borderColor = 'border-red-400';
            textColor = 'text-red-700';
            break;
        case 'info':
            icon = <FaInfoCircle />;
            bgColor = 'bg-blue-100';
            borderColor = 'border-blue-400';
            textColor = 'text-blue-700';
            break;
    }

    return (
        <div
            className={`
        flex items-center p-4 rounded-md border-l-4
        ${bgColor} ${borderColor} ${textColor}
        shadow-lg
      `}
            role="alert"
        >
            <div className="flex-shrink-0 mr-3">
                {icon}
            </div>
            <div className="flex-1">
                <p className="font-medium">{message}</p>
            </div>
        </div>
    );
};

export default Alert;