interface User {
  id: string;
  email: string;
  role: string;
  avatar_url?: string;
  // 👇 THÊM 2 DÒNG NÀY VÀO ĐÂY
  created_at?: string;
  last_login_at?: string;
}