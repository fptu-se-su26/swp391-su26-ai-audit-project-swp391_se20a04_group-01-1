export interface DBEvent {
    event_id: number;
    category_id: number;
    title: string;
    short_description?: string;
    description?: string;
    location_name: string;
    latitude: number;
    longitude: number;
    address?: string;
    district?: string;
    start_time: string;
    end_time?: string;
    banner_url?: string;
    thumbnail_url?: string;
    status: string;
    is_featured: boolean;
    is_free: boolean;
    ticket_price: number;
    view_count: number;
    favorite_count: number;
    created_at: string;
    updated_at: string;
}

export interface TrafficAlert {
    id: number;
    title: string;
    location: string;
    type: 'CONGESTION' | 'ACCIDENT' | 'CONSTRUCTION';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    is_active: boolean;
    created_at: string;
}

export interface FloodZone {
    id: number;
    name: string;
    district: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    is_active: boolean;
    last_updated: string;
}

export interface RoadClosure {
    id: number;
    road_name: string;
    event_title: string;
    restriction_type: 'CLOSED' | 'LIMITED' | 'ONE_WAY' | 'NO_PARKING';
    time_frame: string;
}

export interface ManageUser {
    user_id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    ban_reason?: string;
    avatar_url?: string;
}

export interface EventFormData {
    title: string;
    short_description: string;
    description: string;
    location_name: string;
    latitude: number;
    longitude: number;
    start_time: string;
    end_time: string;
    status: string;
    category_id: number;
}
