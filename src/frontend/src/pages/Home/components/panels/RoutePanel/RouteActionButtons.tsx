import React from 'react';
import { Bookmark, Share2, Heart } from 'lucide-react';
import { showPremiumToast } from '../../../../../utils/toastUtils';
import { useFavoritePoiStore } from '../../../../../store/favoritePoiStore';

interface RouteActionButtonsProps {
  destination: any;
  setShowSaveRouteModal: (val: boolean) => void;
  handleShareRoute: () => void;
  isSharingRoute: boolean;
  favoriteEventIds: Set<number>;
  onToggleEventFavorite: (eventId: number) => Promise<boolean>;
  onClearRoute: () => void;
}

export const RouteActionButtons: React.FC<RouteActionButtonsProps> = ({
  destination,
  setShowSaveRouteModal,
  handleShareRoute,
  isSharingRoute,
  favoriteEventIds,
  onToggleEventFavorite,
  onClearRoute,
}) => {
  const { favoriteIds, toggleFavorite } = useFavoritePoiStore();

  const destinationPoiId = destination?.poi_id;
  const destinationEventId = destination?.event_id;

  const isFavDest = destinationPoiId ? favoriteIds.has(destinationPoiId) : destinationEventId ? favoriteEventIds.has(destinationEventId) : false;
  const canBeFavorited = !!(destinationPoiId || destinationEventId);

  const handleFavDestClick = async () => {
    if (!canBeFavorited) return;
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      showPremiumToast("Vui lòng đăng nhập để lưu địa điểm/sự kiện yêu thích.", "error");
      return;
    }
    try {
      if (destinationPoiId) {
        const res = await toggleFavorite(destinationPoiId);
        showPremiumToast(res ? "Đã lưu địa điểm vào danh sách yêu thích!" : "Đã xóa địa điểm khỏi danh sách yêu thích.", "success");
      } else if (destinationEventId) {
        const isFav = await onToggleEventFavorite(destinationEventId);
        showPremiumToast(isFav ? "Đã lưu sự kiện vào danh sách yêu thích!" : "Đã xóa sự kiện khỏi danh sách.", "success");
      }
    } catch (error) {
      showPremiumToast("Không thể cập nhật trạng thái yêu thích.", "error");
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-3">
      <div className="flex gap-2">
        <button onClick={() => setShowSaveRouteModal(true)} className="flex-1 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors">
          <Bookmark size={13} className="fill-current" /> Lưu lộ trình
        </button>
        <button onClick={handleShareRoute} disabled={isSharingRoute} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
          <Share2 size={13} /> {isSharingRoute ? "Đang tạo..." : "Chia sẻ"}
        </button>
      </div>

      {canBeFavorited ? (
        <button onClick={handleFavDestClick} className={`w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border ${isFavDest ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
          <Heart size={13} className={isFavDest ? "fill-current" : ""} /> {isFavDest ? "Đã lưu yêu thích" : "Lưu địa điểm/sự kiện"}
        </button>
      ) : (
        <div className="text-[10px] text-center text-slate-400 italic py-1">Địa điểm này không thể lưu vào yêu thích.</div>
      )}

      <button onClick={onClearRoute} className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-xl text-[11px] font-bold hover:bg-rose-50 hover:text-rose-600 transition-all">
        Xóa lộ trình
      </button>
    </div>
  );
};
