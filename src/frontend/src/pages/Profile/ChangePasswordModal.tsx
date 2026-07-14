import React, { useState } from 'react';
import { Eye, EyeOff, Lock, X } from 'lucide-react';
import PasswordChecklist from '../../components/PasswordChecklist';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    hasPassword?: boolean; // Nhận biến cờ từ ProfilePage
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSuccess, hasPassword }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const strengthLabels = ['', 'Yếu', 'Trung Bình', 'Tốt', 'Mạnh'];
    const strengthColors = ['', '#EF4444', '#F59E0B', '#10B981', '#059669'];

    const getStrength = (pw: string): 0 | 1 | 2 | 3 | 4 => {
        if (!pw) return 0;
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return score as 0 | 1 | 2 | 3 | 4;
    };

    const strength = getStrength(newPassword);
    const pwMatch = confirmPassword && newPassword === confirmPassword;
    const pwMismatch = confirmPassword && newPassword !== confirmPassword;

    // Khoá nút bấm: Nếu là Google thì không bắt buộc currentPassword
    const isSubmitDisabled = (hasPassword !== false && !currentPassword) || !pwMatch || loading;

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Bỏ qua kiểm tra currentPassword nếu hasPassword là false
        if ((hasPassword !== false && !currentPassword) || !newPassword || !confirmPassword) {
            setError('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu mới không khớp!');
            return;
        }

        if (newPassword.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự!');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/user/change-password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: currentPassword || undefined, // Nếu trống thì không gửi lên
                    newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Lỗi thay đổi mật khẩu!');
                return;
            }

            setSuccess(hasPassword === false ? 'Tạo mật khẩu thành công!' : 'Thay đổi mật khẩu thành công!');
            setTimeout(() => {
                onClose();
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                if (onSuccess) onSuccess();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Lỗi server!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                width: '90%',
                maxWidth: '400px',
                padding: '24px',
                animation: 'slideUp 0.3s ease'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Lock size={18} style={{ color: '#2563EB' }} />
                        {hasPassword === false ? 'Thiết Lập Mật Khẩu' : 'Đổi Mật Khẩu'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '4px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        marginBottom: '16px'
                    }}>
                        ❌ {error}
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div style={{
                        backgroundColor: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        color: '#16a34a',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        marginBottom: '16px'
                    }}>
                        ✅ {success}
                    </div>
                )}

                <form onSubmit={handleChangePassword}>
                    {/* ẨN MẬT KHẨU HIỆN TẠI NẾU LÀ TÀI KHOẢN GOOGLE */}
                    {hasPassword !== false && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '6px'
                            }}>
                                Mật khẩu hiện tại
                            </label>
                            <div style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu hiện tại"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        paddingRight: '36px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        boxSizing: 'border-box',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#6b7280',
                                        padding: '0'
                                    }}
                                >
                                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* New Password */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '6px'
                        }}>
                            Mật khẩu mới
                        </label>
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Tối thiểu 8 ký tự"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    paddingRight: '36px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    boxSizing: 'border-box',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '0'
                                }}
                            >
                                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>

                        {/* Strength Indicator */}
                        {newPassword && (
                            <div style={{ marginTop: '8px' }}>
                                <div style={{
                                    display: 'flex',
                                    gap: '4px',
                                    marginBottom: '4px'
                                }}>
                                    {[1, 2, 3, 4].map(n => (
                                        <div key={n} style={{
                                            flex: 1,
                                            height: '4px',
                                            backgroundColor: strength >= n ? strengthColors[strength] : '#e5e7eb',
                                            borderRadius: '2px',
                                            transition: 'background-color 0.3s ease'
                                        }} />
                                    ))}
                                </div>
                                <p style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: strengthColors[strength]
                                }}>
                                    Độ mạnh: {strengthLabels[strength]}
                                </p>
                                <PasswordChecklist password={newPassword} />
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '6px'
                        }}>
                            Xác nhận mật khẩu
                        </label>
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu mới"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    paddingRight: '36px',
                                    border: pwMismatch ? '1px solid #ef4444' : pwMatch ? '1px solid #10b981' : '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    boxSizing: 'border-box',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '0'
                                }}
                            >
                                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        {pwMismatch && (
                            <p style={{
                                fontSize: '11px',
                                color: '#ef4444',
                                marginTop: '4px'
                            }}>
                                ❌ Mật khẩu không khớp
                            </p>
                        )}
                        {pwMatch && (
                            <p style={{
                                fontSize: '11px',
                                color: '#10b981',
                                marginTop: '4px'
                            }}>
                                ✅ Mật khẩu khớp
                            </p>
                        )}
                    </div>

                    {/* Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '8px'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: '#f3f4f6',
                                color: '#1f2937',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: isSubmitDisabled ? '#9ca3af' : '#2563EB',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => {
                                if (!isSubmitDisabled) {
                                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isSubmitDisabled) {
                                    e.currentTarget.style.backgroundColor = '#2563EB';
                                }
                            }}
                        >
                            {loading ? 'Đang xử lý...' : (hasPassword === false ? 'Tạo Mật Khẩu' : 'Thay Đổi Mật Khẩu')}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default ChangePasswordModal;