import React, { useState } from "react";
import { X, MapPin, UploadCloud, Image as ImageIcon } from "lucide-react";
import { poiAPI } from "../../../services/api";
import { showPremiumToast } from "../../../utils/toastUtils";

interface AddPOIModalProps {
  onClose: () => void;
  onSubmitSuccess: () => void;
  location?: { lat: number; lng: number };
  initialData?: any;
}

const CATEGORIES = [
  { id: 1, name: "Điểm tham quan" },
  { id: 2, name: "Nhà hàng" },
  { id: 3, name: "Khách sạn" },
  { id: 4, name: "Giải trí" },
  { id: 5, name: "Khu mua sắm" },
  { id: 6, name: "Khác" },
  { id: 7, name: "Trạm xăng" },
  { id: 8, name: "Quán cà phê" },
  { id: 9, name: "Bệnh viện" },
];

const AddPOIModal: React.FC<AddPOIModalProps> = ({ onClose, onSubmitSuccess, location, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    category_id: initialData?.category_id || 1,
    address: initialData?.address || "",
    description: initialData?.description || "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.image_url ? `http://localhost:5001${initialData.image_url}` : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showPremiumToast("Vui lòng nhập tên địa điểm", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('category_id', formData.category_id.toString());
      submitData.append('address', formData.address);
      submitData.append('description', formData.description);
      
      if (location) {
        submitData.append('latitude', location.lat.toString());
        submitData.append('longitude', location.lng.toString());
      } else if (initialData) {
        submitData.append('latitude', initialData.latitude.toString());
        submitData.append('longitude', initialData.longitude.toString());
      }
      
      if (imageFile) {
        submitData.append('image', imageFile);
      }

      if (initialData) {
        await poiAPI.updatePOI(initialData.poi_id, submitData);
        showPremiumToast("Cập nhật địa điểm thành công! Đang chờ admin duyệt lại.", "success");
      } else {
        await poiAPI.createPOI(submitData);
        showPremiumToast("Đóng góp địa điểm thành công! Đang chờ admin duyệt.", "success");
      }
      
      onSubmitSuccess();
      onClose();
    } catch (error: any) {
      showPremiumToast(
        error.response?.data?.message || "Lỗi khi lưu địa điểm",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MapPin className="text-blue-500" size={20} />
            {initialData ? "Sửa địa điểm" : "Đóng góp địa điểm"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tên địa điểm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Quán cà phê Mùa Hè..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Danh mục
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Địa chỉ (không bắt buộc)
            </label>
            <input
              type="text"
              placeholder="Nhập địa chỉ cụ thể..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mô tả ngắn
            </label>
            <textarea
              rows={3}
              placeholder="Thông tin thêm về địa điểm này..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Ảnh địa điểm
            </label>
            <div className="flex items-center gap-4">
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover rounded-xl shadow-sm border border-slate-200" />
              )}
              <label className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <UploadCloud size={24} className="text-slate-400" />
                <span className="text-sm text-slate-500 font-medium">{previewUrl ? 'Đổi ảnh khác' : 'Tải ảnh lên'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          </div>
        </form>
          <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {isSubmitting ? "Đang lưu..." : (initialData ? "Lưu thay đổi" : "Gửi địa điểm")}
            </button>
          </div>
      </div>
    </div>
  );
};

export default AddPOIModal;
