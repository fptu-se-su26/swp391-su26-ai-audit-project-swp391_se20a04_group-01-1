import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUsername: string;
    currentAvatar: string;
    onSuccess: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, currentUsername, currentAvatar, onSuccess }) => {
    const [username, setUsername] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setUsername(currentUsername);
            setAvatarFile(null);
            setPreviewUrl(currentAvatar); // Hiển thị ảnh cũ nếu có
            setError('');
        }
    }, [isOpen, currentUsername, currentAvatar]);

    // Hàm xử lý khi chọn file ảnh
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            // Tạo URL tạm thời để xem trước ảnh
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            setError('Username không được để trống!');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            
            // Dùng FormData để gửi cả Text và File
            const formData = new FormData();
            formData.append('username', username);
            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            const response = await fetch('http://localhost:5001/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // LƯU Ý QUAN TRỌNG: Tuyệt đối KHÔNG set 'Content-Type' ở đây khi dùng FormData
                    // Trình duyệt sẽ tự động thêm Content-Type: multipart/form-data kèm theo boundary
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Cập nhật thất bại!');
                return;
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError('Lỗi kết nối server!');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '90%', maxWidth: '400px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>Chỉnh Sửa Hồ Sơ</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
                </div>

                {error && <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Khu vực chọn ảnh */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ 
                            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f3f4f6', 
                            overflow: 'hidden', marginBottom: '10px', border: '2px solid #e5e7eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '30px' }}>👤</span>
                            )}
                        </div>
                        
                        <label style={{
                            cursor: 'pointer', color: '#2563EB', fontSize: '13px', fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                            <Upload size={14} /> Tải ảnh mới lên
                            <input 
                                type="file" 
                                accept="image/jpeg, image/png, image/jpg" 
                                style={{ display: 'none' }} 
                                onChange={handleFileChange}
                            />
                        </label>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>Tên hiển thị</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', color: '#1f2937' }}>Hủy</button>
                        <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', backgroundColor: loading ? '#9ca3af' : '#2563EB', color: 'white', borderRadius: '6px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                            {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;