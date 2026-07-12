export interface POIData {
  poi_id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  description: string | null;
  image_url: string | null;
  website_url: string | null;
  phone_number: string | null;
  rating: number | null;
  is_featured: boolean;
  category_name: string;
  category_icon: string;
  category_color: string;
}
