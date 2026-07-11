import React from 'react';

interface PasswordChecklistProps {
    password: string;
}

const PasswordChecklist: React.FC<PasswordChecklistProps> = ({ password }) => {
    const checks = [
        { label: "Tối thiểu 8 ký tự", passed: password.length >= 8 },
        { label: "Ít nhất 1 chữ hoa", passed: /[A-Z]/.test(password) },
        { label: "Ít nhất 1 chữ thường", passed: /[a-z]/.test(password) },
        { label: "Ít nhất 1 chữ số", passed: /\d/.test(password) }
    ];

    return (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {checks.map((check, idx) => (
                <li 
                    key={idx} 
                    style={{ 
                        color: check.passed ? '#10B981' : '#9CA3AF', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        transition: 'color 0.2s ease'
                    }}
                >
                    <span style={{ fontWeight: 'bold' }}>{check.passed ? "✓" : "✗"}</span> 
                    {check.label}
                </li>
            ))}
        </ul>
    );
};

export default PasswordChecklist;