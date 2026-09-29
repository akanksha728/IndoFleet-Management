import { UserProfile, DroneItem, MissionItem, AuditLogItem } from '../types';

const API_BASE = '/api';

const getToken = (): string | null => typeof localStorage === 'undefined' ? null : localStorage.getItem('iw_token');
const hasSession = (): boolean => Boolean(getToken());

const readError = async (res: Response, fallback: string): Promise<string> => {
  try {
    const data = await res.json();
    return data.error || data.detail?.error || fallback;
  } catch {
    return fallback;
  }
};

const rotateToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('iw_refresh_token');
  if (!refreshToken) return null;
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok) {
    localStorage.removeItem('iw_token');
    localStorage.removeItem('iw_refresh_token');
    localStorage.removeItem('iw_delivery_token');
    return null;
  }
  const data = await response.json();
  localStorage.setItem('iw_token', data.token);
  localStorage.setItem('iw_refresh_token', data.refresh_token);
  localStorage.setItem('iw_delivery_token', data.token);
  return data.token;
};

const request = async (path: string, init: RequestInit = {}, authenticated = true): Promise<any> => {
  const send = (token: string | null) => fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });
  let response = await send(authenticated ? getToken() : null);
  if (response.status === 401 && authenticated && localStorage.getItem('iw_refresh_token')) {
    const token = await rotateToken();
    if (token) response = await send(token);
  }
  if (!response.ok) throw new Error(await readError(response, `Request failed (${response.status})`));
  if (response.status === 204) return null;
  return response.json();
};

const displayOrderStatus = (status: string): string => ({
  dispatched: 'taking-off',
  in_transit: 'in-flight',
  on_hold: 'on-hold'
}[status] || status);

const toDeliveryOrder = (order: any, tracking?: any): any => {
  const timelineSource = tracking?.timeline?.length ? tracking.timeline : order.timeline || [];
  const timeline = timelineSource.map((item: any, index: number) => ({
    step: displayOrderStatus(item.status || item.action || 'pending'),
    time: item.at || item.created_at || null,
    done: true,
    index
  }));
  if (!timeline.length) timeline.push({ step: displayOrderStatus(order.status), time: order.created_at, done: true });
  return {
    ...order,
    id: order.order_id,
    status: displayOrderStatus(order.status),
    customer_name: order.customer?.name || 'Customer',
    customer_email: order.customer?.email || '',
    customer_phone: order.customer?.phone || '',
    pickup_address: order.pickup?.address || '',
    drop_address: order.delivery?.address || '',
    package_type: order.package?.description || 'Parcel',
    package_weight_kg: order.package?.weight || 0,
    scheduled_time: order.scheduled_at || null,
    drone_model: order.drone_id ? 'RPAV-700' : null,
    drone_location: tracking?.drone?.location || null,
    tracking_available: tracking?.live_telemetry_available ?? false,
    timeline
  };
};

const toFleetDrone = (drone: any): any => ({
  ...drone,
  id: drone.drone_id,
  model_name: drone.model,
  serial_number: drone.serial_number,
  current_city: drone.location?.city || '',
  battery_pct: drone.battery ?? 0,
  location: {
    ...drone.location,
    lat: drone.location?.latitude ?? drone.location?.lat ?? null,
    lng: drone.location?.longitude ?? drone.location?.lng ?? null
  },
  status: ({ available: 'idle', in_transit: 'in-flight', on_hold: 'on-hold' } as Record<string, string>)[drone.status] || drone.status
});

const deliveryStatus = (status: string): string => ({
  'in-flight': 'in_transit',
  'taking-off': 'dispatched',
  'on-hold': 'on_hold'
}[status] || status);

const splitIndiaAddress = (address: string): { city: string; state: string } => {
  const cityState: Array<[string, string]> = [
    ['New Delhi', 'Delhi'], ['Delhi', 'Delhi'], ['Noida', 'Uttar Pradesh'], ['Greater Noida', 'Uttar Pradesh'],
    ['Gurugram', 'Haryana'], ['Gurgaon', 'Haryana'], ['Mumbai', 'Maharashtra'], ['Pune', 'Maharashtra'],
    ['Bengaluru', 'Karnataka'], ['Bangalore', 'Karnataka'], ['Hyderabad', 'Telangana'], ['Chennai', 'Tamil Nadu'],
    ['Kolkata', 'West Bengal'], ['Jaipur', 'Rajasthan'], ['Lucknow', 'Uttar Pradesh'], ['Kochi', 'Kerala'],
    ['Ahmedabad', 'Gujarat'], ['Visakhapatnam', 'Andhra Pradesh'], ['Patna', 'Bihar'], ['Bhopal', 'Madhya Pradesh'],
    ['Chandigarh', 'Chandigarh'], ['Dehradun', 'Uttarakhand'], ['Raipur', 'Chhattisgarh'], ['Ranchi', 'Jharkhand']
  ];
  const normalized = address.toLowerCase();
  const match = cityState.find(([city]) => normalized.includes(city.toLowerCase()));
  if (match) return { city: match[0], state: match[1] };
  const pieces = address.split(',').map(piece => piece.trim()).filter(Boolean);
  if (pieces.length < 2) throw new Error('Include a recognizable Indian city in each address (for example, Delhi or Noida).');
  throw new Error('We could not determine the state for this address. Choose an address in a supported operations city.');
};

export const apiClient = {
  // Auth
  async login(email: string, password?: string): Promise<{ token: string; refresh_token: string; user: UserProfile }> {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, ...(password ? { password } : {}) })
    }, false);
    localStorage.setItem('iw_token', data.token);
    localStorage.setItem('iw_refresh_token', data.refresh_token);
    localStorage.setItem('iw_delivery_token', data.token);
    return data;
  },

  async logout(): Promise<void> {
    try { await request('/auth/logout', { method: 'POST' }); } finally {
      localStorage.removeItem('iw_token');
      localStorage.removeItem('iw_refresh_token');
      localStorage.removeItem('iw_delivery_token');
    }
  },

  async getDemoAccounts(): Promise<UserProfile[]> {
    try {
      const data = await request('/auth/demo-accounts', {}, false);
      return data.accounts || [];
    } catch {
      console.warn('API error fetching demo accounts, using fallback');
    }
    return [];
  },

  async getMe(): Promise<UserProfile> {
    const data = await request('/auth/me');
    return data.user;
  },

  // Fleet
  async getFleet(): Promise<DroneItem[]> {
    if (!hasSession()) return [];
    try {
      const data = await request('/fleet?page=1&pageSize=1000');
      return (data.fleet || []).map(toFleetDrone);
    } catch (error) {
      console.warn('API error fetching fleet', error);
      throw error;
    }
  },

  async getFleetStats(): Promise<any> {
    return request('/stats', {}, false);
  },

  // Missions
  async getMissions(): Promise<MissionItem[]> {
    if (!hasSession()) return [];
    try {
      const data = await request('/missions?page=1&pageSize=200');
      return data.missions || [];
    } catch (error) {
      console.warn('API error fetching missions', error);
      throw error;
    }
  },

  async createMission(mission: Partial<MissionItem>, token: string): Promise<MissionItem> {
    const data = await request('/missions', {
      method: 'POST',
      body: JSON.stringify(mission)
    });
    return data.mission;
  },

  async updateMissionStatus(id: string, status: string, token: string): Promise<void> {
    await request(`/missions/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async getOrders(): Promise<any[]> {
    if (!hasSession()) return [];
    const data = await request('/orders?page=1&pageSize=200');
    return (data.orders || []).map((order: any) => toDeliveryOrder(order));
  },

  async getOrder(orderId: string): Promise<any> {
    const data = await request(`/orders/${encodeURIComponent(orderId)}`);
    return toDeliveryOrder(data.order);
  },

  async getOrderTracking(orderId: string): Promise<any> {
    const [orderData, tracking] = await Promise.all([
      request(`/orders/${encodeURIComponent(orderId)}`),
      request(`/orders/${encodeURIComponent(orderId)}/tracking`)
    ]);
    return toDeliveryOrder(orderData.order, tracking);
  },

  async createDeliveryOrder(input: {
    pickupAddress: string; deliveryAddress: string; customerName: string; customerEmail: string;
    customerPhone: string; packageDescription: string; weight: number; scheduledAt?: string | null;
  }): Promise<any> {
    const pickup = splitIndiaAddress(input.pickupAddress);
    const delivery = splitIndiaAddress(input.deliveryAddress);
    const created = await request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer: { name: input.customerName, email: input.customerEmail, phone: input.customerPhone },
        pickup: { address: input.pickupAddress, ...pickup },
        delivery: { address: input.deliveryAddress, ...delivery },
        package: { description: input.packageDescription, weight: input.weight }
      })
    });
    let order = created.order;
    if (input.scheduledAt) {
      const scheduled = await request(`/orders/${encodeURIComponent(order.order_id)}/schedule`, {
        method: 'POST', body: JSON.stringify({ scheduled_at: new Date(input.scheduledAt).toISOString() })
      });
      order = scheduled.order;
    }
    return toDeliveryOrder(order);
  },

  async scheduleOrder(orderId: string, scheduledAt: string): Promise<any> {
    const data = await request(`/orders/${encodeURIComponent(orderId)}/schedule`, {
      method: 'POST', body: JSON.stringify({ scheduled_at: new Date(scheduledAt).toISOString() })
    });
    return toDeliveryOrder(data.order);
  },

  async rescheduleOrder(orderId: string, scheduledAt: string, reason: string): Promise<any> {
    const data = await request(`/orders/${encodeURIComponent(orderId)}/reschedule`, {
      method: 'POST', body: JSON.stringify({ scheduled_at: new Date(scheduledAt).toISOString(), reason })
    });
    return toDeliveryOrder(data.order);
  },

  async assignDrone(orderId: string, droneId?: string): Promise<any> {
    let chosenDrone = droneId;
    if (!chosenDrone) {
      const order = await request(`/orders/${encodeURIComponent(orderId)}`);
      const drones = await request('/fleet?page=1&pageSize=1000');
      const candidate = (drones.fleet || []).find((drone: any) =>
        drone.status === 'available' && drone.location?.state === order.order.pickup.state &&
        (!order.order.pickup.hub_id || drone.location?.hub_id === order.order.pickup.hub_id)
      );
      if (!candidate) throw new Error('No available RPAV drone is assigned to the pickup region.');
      chosenDrone = candidate.drone_id;
    }
    const data = await request(`/orders/${encodeURIComponent(orderId)}/assign-drone`, {
      method: 'POST', body: JSON.stringify({ drone_id: chosenDrone })
    });
    return toDeliveryOrder(data.order);
  },

  async dispatchOrder(orderId: string): Promise<any> {
    let order = await request(`/orders/${encodeURIComponent(orderId)}`);
    const current = order.order;
    if (current.status === 'pending') {
      await this.scheduleOrder(orderId, new Date(Date.now() + 5 * 60_000).toISOString());
      order = await request(`/orders/${encodeURIComponent(orderId)}`);
    } else if (current.status === 'rescheduled') {
      await this.scheduleOrder(orderId, current.scheduled_at || new Date(Date.now() + 5 * 60_000).toISOString());
      order = await request(`/orders/${encodeURIComponent(orderId)}`);
    }
    if (!order.order.drone_id) await this.assignDrone(orderId);
    const dispatched = await request(`/orders/${encodeURIComponent(orderId)}/dispatch`, { method: 'POST' });
    await request(`/orders/${encodeURIComponent(orderId)}/in-transit`, { method: 'POST' });
    return toDeliveryOrder(dispatched.order);
  },

  async holdOrder(orderId: string, reason = 'Operational hold initiated by dispatch'): Promise<any> {
    const data = await request(`/orders/${encodeURIComponent(orderId)}/hold`, { method: 'POST', body: JSON.stringify({ reason }) });
    return toDeliveryOrder(data.order);
  },

  async cancelOrder(orderId: string, reason: string): Promise<any> {
    const data = await request(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
    return toDeliveryOrder(data.order);
  },

  async completeOrder(orderId: string): Promise<any> {
    let order = await request(`/orders/${encodeURIComponent(orderId)}`);
    if (order.order.status === 'dispatched') await request(`/orders/${encodeURIComponent(orderId)}/in-transit`, { method: 'POST' });
    order = await request(`/orders/${encodeURIComponent(orderId)}/complete`, { method: 'POST' });
    return toDeliveryOrder(order.order);
  },

  async updateDeliveryStatus(orderId: string, status: string): Promise<any> {
    const canonical = deliveryStatus(status);
    if (canonical === 'in_transit' || canonical === 'dispatched') return this.dispatchOrder(orderId);
    if (canonical === 'on_hold') return this.holdOrder(orderId);
    if (canonical === 'delivered') return this.completeOrder(orderId);
    if (canonical === 'cancelled') return this.cancelOrder(orderId, 'Cancelled by operations');
    throw new Error(`Unsupported delivery status action: ${status}`);
  },

  async updateDrone(droneId: string, status: string): Promise<any> {
    const mapped = status === 'idle' ? 'available' : status;
    const data = await request(`/fleet/${encodeURIComponent(droneId)}`, {
      method: 'PATCH', body: JSON.stringify({ status: mapped })
    });
    return toFleetDrone(data.drone);
  },

  async registerDrone(input: { model: string; city: string }): Promise<any> {
    const [fleet, hubData] = await Promise.all([
      request('/fleet?page=1&pageSize=1000'),
      request('/locations/hubs')
    ]);
    const hubs = hubData.hubs || [];
    const value = input.city.toLowerCase();
    const desiredCity = value.includes('noida') ? 'Noida'
      : value.includes('gurugram') || value.includes('gurgaon') ? 'Gurugram'
        : value.includes('delhi') || value.includes('connaught') ? 'New Delhi'
          : value.includes('mumbai') ? 'Mumbai' : null;
    const hub = hubs.find((item: any) => item.city === desiredCity);
    if (!hub) throw new Error('No operations hub matches this drone location.');
    const nextNumber = Math.max(0, ...(fleet.fleet || []).map((item: any) => Number(item.drone_id.slice(-6)) || 0)) + 1;
    if (nextNumber > 999999) throw new Error('No RPAV drone IDs remain available.');
    const droneId = `RPAV-${String(nextNumber).padStart(6, '0')}`;
    const data = await request('/fleet', {
      method: 'POST', body: JSON.stringify({
        drone_id: droneId, serial_number: `RPAV700-${String(nextNumber).padStart(6, '0')}`,
        model: 'RPAV-700', location: {
          state: hub.state, city: hub.city, hub_id: hub.hub_id,
          latitude: hub.latitude || 0, longitude: hub.longitude || 0
        }
      })
    });
    return toFleetDrone(data.drone);
  },

  async createPaymentOrder(orderId: string, amount: number, method: 'upi' | 'credit_card' | 'debit_card' | 'netbanking' | 'wallet' = 'upi'): Promise<any> {
    return request('/payments/create-order', {
      method: 'POST', body: JSON.stringify({ order_id: orderId, amount, currency: 'INR', method })
    });
  },

  async verifyPayment(paymentId: string, gatewayOrderId: string, gatewayPaymentId: string, gatewaySignature: string): Promise<any> {
    return request('/payments/verify', {
      method: 'POST', body: JSON.stringify({ payment_id: paymentId, gateway_order_id: gatewayOrderId, gateway_payment_id: gatewayPaymentId, gateway_signature: gatewaySignature })
    });
  },

  // Audit
  async getAuditLogs(): Promise<AuditLogItem[]> {
    if (!hasSession()) return [];
    try {
      const data = await request('/audit-logs?page=1&pageSize=100');
      return data.logs || [];
    } catch (error) {
      console.warn('API error fetching audit logs', error);
      throw error;
    }
  },

  // Stats
  async getStats() {
    try {
      return await request('/stats', {}, false);
    } catch (error) {
      console.warn('API error fetching stats', error);
      throw error;
    }
  },

  // Demo Booking & Leads
  async submitDemoRequest(formData: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    drone_interest: string;
    use_case?: string;
    message?: string;
  }) {
    return request('/contact/demo-request', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  }
};
