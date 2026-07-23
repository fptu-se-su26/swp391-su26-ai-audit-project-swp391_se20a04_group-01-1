import React from "react";
import { Check, X, RefreshCw, Image as ImageIcon } from "lucide-react";
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
        error.response?.data?.message || "Không thể tải danh sách ảnh.",
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

  const handleReject = async (imageId: number) => {
    if (processingId !== null) return;

    const reason = window.prompt(
      "Nhập lý do từ chối ảnh:",
      "Ảnh không phù hợp hoặc không liên quan đến sự kiện",
    );

    if (!reason?.trim()) {
      return;
    }

    setProcessingId(imageId);

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
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
          >
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
          </select>

          <button
            type="button"
            onClick={fetchImages}
            disabled={loading}
            className="w-10 h-10 rounded-xl border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50"
            title="Tải lại"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-10 text-center text-slate-500">
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
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white"
              >
                <div className="h-44 bg-slate-100">
                  <img
                    src={resolveImageUrl(image.image_url)}
                    alt={image.caption || "Ảnh sự kiện"}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-slate-800 line-clamp-2">
                    {image.event_title || `Sự kiện #${image.event_id}`}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {image.caption || "Không có chú thích"}
                  </p>

                  <p className="text-xs text-slate-400">
                    Trạng thái: {image.approval_status}
                  </p>

                  {image.rejection_reason && (
                    <p className="text-xs text-red-500">
                      Lý do: {image.rejection_reason}
                    </p>
                  )}

                  {status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(image.image_id)}
                        disabled={processingId === image.image_id}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Check size={16} />
                        Duyệt
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReject(image.image_id)}
                        disabled={processingId === image.image_id}
                        className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
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
    </section>
  );
}
