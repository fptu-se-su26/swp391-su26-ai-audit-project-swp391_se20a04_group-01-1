/**
 * Tạo link chia sẻ lộ trình. Tách từ hooks/useShareController.ts - trước đó là logic
 * giả lập (setTimeout + random token), nay đưa vào 1 hàm service riêng để dễ dàng
 * thay bằng lời gọi API thật khi backend có endpoint tạo share-link.
 */
export async function createRouteShareLink(routeData: any): Promise<string> {
  // TODO: thay bằng API thật, VD: POST {apiUrl}/api/routes/share
  return new Promise((resolve) => {
    setTimeout(() => {
      const fakeToken = Math.random().toString(36).substring(7);
      resolve(`https://dnpulse.vn/route/${fakeToken}`);
    }, 800);
  });
}
