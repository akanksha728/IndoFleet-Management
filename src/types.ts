export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  full_name: string;
  role: 'admin' | 'state_manager' | 'hub_manager' | 'dispatcher' | 'operator' | 'viewer';
  organization: string;
  badge_id: string;
}

export interface DroneItem {
  id: string;
  model_name: string;
  category: string;
  serial_number: string;
  status: 'available' | 'assigned' | 'in_transit' | 'scheduled' | 'on_hold' | 'rescheduled' | 'maintenance' | 'offline' | 'ready' | 'in-flight' | 'standby';
  battery_pct: number;
  flight_hours: number;
  max_range_km: number;
  endurance_mins: number;
  max_speed_kmh: number;
  payload_capacity_kg: number;
  image_url: string;
  drone_id?: string;
  name?: string;
  model?: string;
  location?: { city: string; state: string; lat: number; lng: number };
  current_mission_id?: string | null;
  updated_at?: string;
}

export interface MissionItem {
  id: string;
  title: string;
  pilot_email: string;
  drone_model: string;
  status: 'pending' | 'scheduled' | 'assigned' | 'dispatched' | 'in_transit' | 'on_hold' | 'rescheduled' | 'delivered' | 'cancelled' | 'failed' | 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ABORTED';
  location_name: string;
  area_hectares: number;
  altitude_meters: number;
  waypoints?: Array<{ lat: number; lng: number; alt: number }>;
  created_at?: string;
  mission_id?: string;
  order_id?: string;
  pickup?: { address: string; city: string; state: string };
  delivery?: { address: string; city: string; state: string };
  drone_id?: string | null;
  scheduled_at?: string;
  updated_at?: string;
}

export interface AuditLogItem {
  id: string;
  user_email: string;
  role: string;
  action: string;
  resource: string;
  ip_address: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  timestamp: string;
}

export interface DeliveryUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
}

export interface OrderTimeline {
  step: string;
  time: string | null;
  done: boolean;
}

export interface DeliveryOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_address: string;
  drop_address: string;
  package_type: string;
  weight_kg: number;
  status: 'pending' | 'assigned' | 'taking-off' | 'in-flight' | 'approaching' | 'delivered' | 'failed' | 'on-hold' | 'rescheduled';
  drone_id: string | null;
  drone_model: string | null;
  scheduled_time: string | null;
  estimated_delivery: string;
  created_at: string;
  timeline: OrderTimeline[];
}

