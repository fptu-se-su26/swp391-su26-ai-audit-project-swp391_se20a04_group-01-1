import React, { useState, useEffect } from "react";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    if (!initialData?.image_url) return null;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const url = initialData.image_url;
    return url.startsWith('http') || url.startsWith('blob:') ? url : `${base}${url}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const [poiLocation, setPoiLocation] = useState<{ lat: number; lng: number } | null>(
    location ? { lat: location.lat, lng: location.lng } : null
  );
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (location && !initialData) {
      const fetchAddress = async () => {
        setIsLoadingAddress(true);
        try {
          const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${mapboxToken}&language=vi&limit=1`
          );
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const addressStr = data.features[0].place_name_vi || data.features[0].place_name || "";
            setFormData((prev) => ({ ...prev, address: addressStr }));
          }
        } catch (error) {
          console.error("Lỗi lấy địa chỉ tự động:", error);
        } finally {
          setIsLoadingAddress(false);
        }
      };
      fetchAddress();
    }
  }, [location, initialData]);

  useEffect(() => {
    if (!isFocused || !formData.address.trim() || formData.address.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(formData.address)}&access_token=${mapboxToken}&bbox=108.0,15.9,108.4,16.2&limit=5&language=vi`
        );
        const data = await response.json();
        if (data.features) {
          const normalized = data.features.map((f: any) => ({
            id: f.properties?.mapbox_id || f.id,
            place_name: f.properties?.full_address || f.properties?.name || "",
            place_name_vi: f.properties?.full_address || f.properties?.name || "",
            center: f.geometry?.coordinates || [0, 0],
          }));
          setSuggestions(normalized);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Lỗi lấy gợi ý địa chỉ:", error);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.address, isFocused]);

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
      
      if (poiLocation) {
        submitData.append('latitude', poiLocation.lat.toString());
        submitData.append('longitude', poiLocation.lng.toString());
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

          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Địa chỉ (không bắt buộc)
            </label>
            <input
              type="text"
              placeholder={isLoadingAddress ? "Đang tự động xác định địa chỉ..." : "Nhập địa chỉ cụ thể..."}
              disabled={isLoadingAddress}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200 disabled:opacity-60"
              value={formData.address}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            {loadingSuggestions && (
              <div className="absolute right-3 top-[38px] -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {suggestions.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const [lng, lat] = item.center;
                      setPoiLocation({ lat, lng });
                      setFormData((prev) => ({
                        ...prev,
                        address: item.place_name_vi || item.place_name,
                      }));
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                  >
                    {item.place_name_vi || item.place_name}
                  </button>
                ))}
              </div>
            )}
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
