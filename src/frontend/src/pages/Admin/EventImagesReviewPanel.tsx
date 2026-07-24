import React from "react";
import { Check, X, RefreshCw, Image as ImageIcon, AlertTriangle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { adminEventImageAPI } from "../../services/api";

type ImageStatus = "pending" | "approved" | "rejected";

interface EventImageItem {
  image_id: number;
  event_id: number;
  image_url: string;
  caption?: string;
  display_order?: number;
  uploaded_at?: string;
  approval_status: ImageStatus;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  event_title?: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const resolveImageUrl = (url?: string | null): string => {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  return `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

export default function EventImagesReviewPanel() {
  const [status, setStatus] = React.useState<ImageStatus>("pending");
  const [images, setImages] = React.useState<EventImageItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [processingId, setProcessingId] = React.useState<number | null>(null);

  // Custom Reject Modal State
  const [rejectModal, setRejectModal] = React.useState<{
    isOpen: boolean;
    imageId: number | null;
    eventTitle: string;
    imageUrl: string;
    reason: string;
  }>({
    isOpen: false,
    imageId: null,
    eventTitle: "",
    imageUrl: "",
    reason: "Ảnh không phù hợp hoặc không liên quan đến sự kiện",
  });

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await adminEventImageAPI.getImagesByStatus(status);
      setImages(response.data.data || []);
    } catch (error: any) {
      console.error("Lỗi tải danh sách ảnh:", error);
      if (error.response?.status === 429) {
        return;
      }
      toast.error(
        error.response?.data?.message || "Không thể tải danh sách ảnh."
      );
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchImages();
  }, [status]);

  const handleApprove = async (imageId: number) => {
    if (processingId !== null) return;
    setProcessingId(imageId);
    try {
      await adminEventImageAPI.approveImage(imageId);
      toast.success("Đã duyệt ảnh thành công!");
      await fetchImages();
    } catch (error: any) {
      console.error("Lỗi duyệt ảnh:", error);
      toast.error(error.response?.data?.message || "Không thể duyệt ảnh.");
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (image: EventImageItem) => {
    setRejectModal({
      isOpen: true,
      imageId: image.image_id,
      eventTitle: image.event_title || `Sự kiện #${image.event_id}`,
      imageUrl: resolveImageUrl(image.image_url),
      reason: "Ảnh không phù hợp hoặc không liên quan đến sự kiện",
    });
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.imageId || !rejectModal.reason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối ảnh!");
      return;
    }

    const { imageId, reason } = rejectModal;
    setProcessingId(imageId);
    setRejectModal((prev) => ({ ...prev, isOpen: false }));

    try {
      await adminEventImageAPI.rejectImage(imageId, reason.trim());
      toast.success("Đã từ chối ảnh.");
      await fetchImages();
    } catch (error: any) {
      console.error("Lỗi từ chối ảnh:", error);
      toast.error(error.response?.data?.message || "Không thể từ chối ảnh.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon size={20} className="text-blue-600" />
            Duyệt ảnh người dùng đóng góp
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Ảnh chỉ xuất hiện công khai sau khi Admin duyệt.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ImageStatus)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
          </select>

          <button
            type="button"
            onClick={fetchImages}
            disabled={loading}
            className="w-10 h-10 rounded-xl border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 transition"
            title="Tải lại"
          >
            <RefreshCw size={17} className={loading ? "animate-spin text-blue-600" : "text-slate-600"} />
          </button>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-10 text-center text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw size={18} className="animate-spin text-blue-500" />
            Đang tải danh sách ảnh...
          </div>
        ) : images.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            Không có ảnh nào trong danh sách này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {images.map((image) => (
              <article
                key={image.image_id}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs hover:shadow-md transition"
              >
                <div className="h-44 bg-slate-100 relative overflow-hidden group">
                  <img
                    src={resolveImageUrl(image.image_url)}
                    alt={image.caption || "Ảnh sự kiện"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-slate-800 line-clamp-2">
                    {image.event_title || `Sự kiện #${image.event_id}`}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {image.caption || "Không có chú thích"}
                  </p>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        image.approval_status === "approved"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : image.approval_status === "pending"
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-rose-50 text-rose-600 border border-rose-200"
                      }`}
                    >
                      {image.approval_status === "approved"
                        ? "Đã duyệt"
                        : image.approval_status === "pending"
                        ? "Chờ duyệt"
                        : "Đã từ chối"}
                    </span>
                  </div>

                  {image.rejection_reason && (
                    <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                      Lý do từ chối: {image.rejection_reason}
                    </p>
                  )}

                  {status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(image.image_id)}
                        disabled={processingId === image.image_id}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50 transition shadow-sm"
                      >
                        <Check size={16} />
                        Duyệt
                      </button>

                      <button
                        type="button"
                        onClick={() => openRejectModal(image)}
                        disabled={processingId === image.image_id}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50 transition shadow-sm"
                      >
                        <X size={16} />
                        Từ chối
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* CUSTOM MODAL CONFIRM TỪ CHỐI DUYỆT ẢNH */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full text-left font-sans animate-scale-up">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-rose-50 text-rose-600 border border-rose-100">
                  <XCircle size={22} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Từ chối ảnh đóng góp
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {rejectModal.eventTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {rejectModal.imageUrl && (
              <div className="mb-4 h-32 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={rejectModal.imageUrl}
                  alt="Ảnh xem trước"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Lý do từ chối ảnh (*)
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectModal.reason}
                  onChange={(e) =>
                    setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Nhập lý do từ chối..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-700"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
                >
                  <XCircle size={15} />
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
