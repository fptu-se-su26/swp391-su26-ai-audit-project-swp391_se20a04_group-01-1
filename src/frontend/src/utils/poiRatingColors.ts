// ✅ Bảng màu theo mức đánh giá (sao) của POI — dùng chung cho POIsLayer (tô màu điểm)
// và POILegend (bảng chú thích), đảm bảo đồng bộ 1 nguồn duy nhất.

export interface PoiRatingLevel {
  label: string;
  color: string;
  // Ngưỡng dưới (inclusive) của mức này, null = dành cho POI chưa có rating
  min: number | null;
}

// Thứ tự từ cao xuống thấp để hiển thị trong bảng chú thích
export const POI_RATING_LEVELS: PoiRatingLevel[] = [
  { label: "5 sao", color: "#16a34a", min: 5 },
  { label: "4 - 4.9 sao", color: "#84cc16", min: 4 },
  { label: "3 - 3.9 sao", color: "#eab308", min: 3 },
  { label: "2 - 2.9 sao", color: "#f97316", min: 2 },
  { label: "1 - 1.9 sao", color: "#ef4444", min: 1 },
  { label: "Chưa đánh giá", color: "#94a3b8", min: null },
];

// Trả về mã màu tương ứng với mức rating (0-5 sao) của 1 POI
export function getPoiRatingColor(rating: number | null | undefined): string {
  if (rating === null || rating === undefined || rating <= 0) {
    return POI_RATING_LEVELS.find((l) => l.min === null)!.color;
  }
  for (const level of POI_RATING_LEVELS) {
    if (level.min !== null && rating >= level.min) {
      return level.color;
    }
  }
  return POI_RATING_LEVELS.find((l) => l.min === null)!.color;
}
