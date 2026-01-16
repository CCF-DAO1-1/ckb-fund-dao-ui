import React from 'react';

interface ActionButtonProps {
    onClick: () => void;
    label: string;
    className?: string;
}

export default function ActionButton({ onClick, label, className = '' }: ActionButtonProps) {
    return (
        <button
            className={`action-button ${className}`}
            onClick={onClick}
            style={{
                marginLeft: "2px",
                padding: "2px 12px",
                backgroundColor: "#00CC9B",
                color: "#000000",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
            }}
        >
            {label}
        </button>
    );
}
