export const formatToVNTime = (isoString: string) => {
  const date = new Date(isoString);
  // Cộng thêm 7 tiếng (tính bằng mili giây)
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  
  return vnTime.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};