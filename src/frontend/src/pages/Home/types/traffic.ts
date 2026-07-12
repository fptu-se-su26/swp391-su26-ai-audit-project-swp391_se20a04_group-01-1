export interface TrafficAlert {
  id: number;
  title: string;
  description?: string;
  type: "CONGESTION" | "ACCIDENT" | "CONSTRUCTION" | string;
  severity: "HIGH" | "MEDIUM" | "LOW" | string;
  location: string;
  longitude: number;
  latitude: number;
  is_active: boolean;
}

export interface TrafficReportFormData {
  title: string;
  description: string;
  location: string;
}
