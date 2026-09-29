import React, { useState, useEffect, useRef } from 'react';
import { 
  Package2, MapPin, Scale, Clock, Phone, Mail, User, Check, 
  ArrowRight, Loader2, Truck, CreditCard, ShieldCheck, Zap, 
  Crosshair, Navigation, Building2, Sparkles, Banknote, Home, 
  UserPlus, ExternalLink, MessageSquare, HeartHandshake, CheckCircle2,
  Copy, CheckCheck, ArrowUpDown, ArrowUpRight, Info, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { DeliveryUser, SavedAddress } from '../components/AuthModal';
import { apiClient } from '../api/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlaceOrderPageProps {
  onNavigate: (page: string) => void;
  currentUser: DeliveryUser | null;
  onOpenAuth: () => void;
}

const PACKAGE_TYPES = ['Medical Supplies', 'Documents', 'Food Parcel', 'Electronics', 'Personal Items', 'Fragile Items', 'Other'];

// Pre-verified IndoWings NCR Air Corridor Hubs
const POPULAR_HUBS = [
  { name: 'Sector 62 IndoWings Hub, Noida', short: 'Noida Sec 62', lat: 28.6280, lng: 77.3649, type: 'UAV Hub' },
  { name: 'Connaught Place Outer Circle, Delhi', short: 'CP Metro', lat: 28.6315, lng: 77.2167, type: 'Drop Zone' },
  { name: 'AIIMS Trauma Center, New Delhi', short: 'AIIMS Port', lat: 28.5672, lng: 77.2100, type: 'Medical Port' },
  { name: 'Cyber City DLF Phase 2, Gurugram', short: 'Cyber City', lat: 28.4907, lng: 77.0898, type: 'Tech Corridor' },
  { name: 'IGI Airport Aerocity Cargo, Delhi', short: 'IGI Aerocity', lat: 28.5562, lng: 77.1000, type: 'Air Cargo' },
  { name: 'Knowledge Park III, Greater Noida', short: 'Gr. Noida Tech', lat: 28.4744, lng: 77.4947, type: 'Industrial Hub' },
];

export const PlaceOrderPage: React.FC<PlaceOrderPageProps> = ({ onNavigate, currentUser, onOpenAuth }) => {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>({ lat: 28.6280, lng: 77.3649 });
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number } | null>({ lat: 28.6315, lng: 77.2167 });
  
  // Saved Addresses from User Profile
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(currentUser?.saved_addresses || []);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedPickupAddressId, setSelectedPickupAddressId] = useState<string | null>(null);
  const [addressTargetMode, setAddressTargetMode] = useState<'drop' | 'pickup'>('drop');

  // Order for Someone Else State
  const [isOrderingForSomeoneElse, setIsOrderingForSomeoneElse] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Autocomplete Suggestions State
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<any[]>([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropDropdown, setShowDropDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<'pickup' | 'drop' | null>(null);

  const [packageType, setPackageType] = useState('Medical Supplies');
  const [weight, setWeight] = useState('1.0');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [contactName, setContactName] = useState(currentUser?.name || '');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showCalcExplainer, setShowCalcExplainer] = useState(false);

  // Auto-scroll window to top whenever successOrder is displayed
  useEffect(() => {
    if (successOrder) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [successOrder]);

  const handleCopyTrackingId = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const pickupRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Apply saved address to either pickup or drop target
  const handleApplyAddress = (addr: SavedAddress, target: 'pickup' | 'drop') => {
    const formatted = `${addr.full_address}${addr.landmark ? `, Near ${addr.landmark}` : ''}, ${addr.city} ${addr.pincode}`;

    if (target === 'pickup') {
      setSelectedPickupAddressId(addr.id);
      setPickup(formatted);

      if (addr.lat && addr.lng) {
        setPickupCoords({ lat: addr.lat, lng: addr.lng });
      } else {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr.city + ' ' + addr.pincode)}&countrycodes=in&limit=1`)
          .then(res => res.json())
          .then(data => {
            if (data && data[0]) {
              setPickupCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            }
          })
          .catch(() => {});
      }
    } else {
      setSelectedAddressId(addr.id);
      setDrop(formatted);

      if (addr.lat && addr.lng) {
        setDropCoords({ lat: addr.lat, lng: addr.lng });
      } else {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr.city + ' ' + addr.pincode)}&countrycodes=in&limit=1`)
          .then(res => res.json())
          .then(data => {
            if (data && data[0]) {
              setDropCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            }
          })
          .catch(() => {});
      }

      if (addr.recipient_name) {
        setRecipientName(addr.recipient_name);
      }
      if (addr.recipient_phone) {
        setRecipientPhone(addr.recipient_phone);
      }
    }
  };

  const handleSelectSavedAddress = (addr: SavedAddress, target?: 'pickup' | 'drop') => {
    handleApplyAddress(addr, target || addressTargetMode);
  };

  const handleSwapRoute = () => {
    const tempPickup = pickup;
    const tempPickupCoords = pickupCoords;
    const tempPickupId = selectedPickupAddressId;

    setPickup(drop);
    setPickupCoords(dropCoords);
    setSelectedPickupAddressId(selectedAddressId);

    setDrop(tempPickup);
    setDropCoords(tempPickupCoords);
    setSelectedAddressId(tempPickupId);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (pickupRef.current && !pickupRef.current.contains(e.target as Node)) {
        setShowPickupDropdown(false);
      }
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDropDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Fetch address suggestions from OpenStreetMap Nominatim
  const fetchSuggestions = async (query: string, field: 'pickup' | 'drop') => {
    if (!query || query.length < 3) {
      if (field === 'pickup') setPickupSuggestions([]);
      else setDropSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&addressdetails=1`);
      const data = await res.json();
      const formatted = data.map((item: any) => ({
        display_name: item.display_name,
        short_name: item.name || item.display_name.split(',')[0],
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type || 'Location'
      }));

      if (field === 'pickup') {
        setPickupSuggestions(formatted);
        setShowPickupDropdown(true);
      } else {
        setDropSuggestions(formatted);
        setShowDropDropdown(true);
      }
    } catch {
      const local = POPULAR_HUBS.filter(h => h.name.toLowerCase().includes(query.toLowerCase()));
      if (field === 'pickup') {
        setPickupSuggestions(local);
        setShowPickupDropdown(true);
      } else {
        setDropSuggestions(local);
        setShowDropDropdown(true);
      }
    }
  };

  useEffect(() => {
    if (activeSearchField !== 'pickup') return;
    const timer = setTimeout(() => { fetchSuggestions(pickup, 'pickup'); }, 350);
    return () => clearTimeout(timer);
  }, [pickup, activeSearchField]);

  useEffect(() => {
    if (activeSearchField !== 'drop') return;
    const timer = setTimeout(() => { fetchSuggestions(drop, 'drop'); }, 350);
    return () => clearTimeout(timer);
  }, [drop, activeSearchField]);

  // AUTO GPS LOCATION (Current Location Detect)
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickupCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setPickup(data.display_name.split(',').slice(0, 3).join(', '));
          } else {
            setPickup(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        } catch {
          setPickup(`GPS Location: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`);
        } finally {
          setIsLocating(false);
          setShowPickupDropdown(false);
        }
      },
      () => {
        setIsLocating(false);
        setError('GPS permission denied or unavailable. Please pick a location from suggestions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Aerial Distance Calculation (Haversine formula in KM)
  const calculateDistanceKm = () => {
    if (!pickupCoords || !dropCoords) return 14.2;
    const R = 6371;
    const dLat = (dropCoords.lat - pickupCoords.lat) * Math.PI / 180;
    const dLon = (dropCoords.lng - pickupCoords.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pickupCoords.lat * Math.PI / 180) * Math.cos(dropCoords.lat * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.max(2.0, Math.round(d * 10) / 10);
  };

  const aerialDistKm = calculateDistanceKm();
  const flightMins = Math.round((aerialDistKm / 65) * 60) + 4; // 65 km/h UAV cruising speed + 4 mins takeoff/landing

  // Dynamic Fare Calculation
  const weightNum = Math.max(0.5, parseFloat(weight) || 1.0);
  const baseFare = 149;
  const extraWeightFee = weightNum > 1.0 ? Math.round((weightNum - 1.0) * 50) : 0;
  const distanceSurcharge = aerialDistKm > 15 ? Math.round((aerialDistKm - 15) * 5) : 0;
  const totalFare = baseFare + extraWeightFee + distanceSurcharge;

  // Delivery records and scheduling are persisted by FastAPI.
  const createOrderRecord = async () => {
    const finalCustomerName = isOrderingForSomeoneElse && recipientName.trim()
      ? recipientName.trim()
      : (contactName || currentUser?.name || 'Customer');
    const finalCustomerPhone = isOrderingForSomeoneElse && recipientPhone.trim()
      ? recipientPhone.trim()
      : (contactPhone || currentUser?.phone || '');

    return apiClient.createDeliveryOrder({
      pickupAddress: pickup,
      deliveryAddress: drop,
      packageDescription: `${packageType}${deliveryNotes.trim() ? `: ${deliveryNotes.trim()}` : ''}`,
      weight: weightNum,
      customerName: finalCustomerName,
      customerEmail: currentUser?.email || contactEmail,
      customerPhone: finalCustomerPhone,
      scheduledAt: scheduleMode === 'later' ? scheduledTime : null
    });
  };

  const handlePayAndOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { onOpenAuth(); return; }
    if (!pickup.trim()) { setError('Please enter pickup address'); return; }
    if (!drop.trim()) { setError('Please enter drop address'); return; }
    if (!contactEmail.includes('@')) { setError('Please enter a valid customer email address'); return; }
    if (!isOrderingForSomeoneElse && contactPhone.replace(/[^0-9]/g, '').length < 10) {
      setError('Please enter a valid 10-digit customer mobile number.');
      return;
    }

    if (isOrderingForSomeoneElse) {
      if (!recipientName.trim()) {
        setError('Please enter recipient full name');
        return;
      }
      if (!recipientPhone.trim() || recipientPhone.replace(/[^0-9]/g, '').length < 10) {
        setError('Please enter a valid 10-digit mobile number for recipient SMS arrival updates');
        return;
      }
    }

    setLoading(true);
    setError('');

    // If Cash on Delivery (COD) chosen
    if (paymentMethod === 'cod') {
      try {
        const order = await createOrderRecord();
        localStorage.setItem('iw_last_order_id', order.id);
        setSuccessOrder({ ...order, fare_inr: totalFare, payment_method: 'cod' });
      } catch (err: any) {
        setError(err.message || 'Failed to dispatch COD delivery order');
      } finally {
        setLoading(false);
      }
      return;
    }

    let paymentOrderRecord: any = null;
    try {
      const order = await createOrderRecord();
      paymentOrderRecord = order;
      localStorage.setItem('iw_last_order_id', order.id);
      const payment = await apiClient.createPaymentOrder(order.id, totalFare, 'upi');
      const gatewayOrder = payment.gateway_order;

      // 2. Open Razorpay Checkout Modal
      const razorpayKey = payment.key_id;

      if (typeof window.Razorpay !== 'undefined') {
        const options = {
          key: razorpayKey,
          amount: gatewayOrder.amount,
          currency: gatewayOrder.currency || 'INR',
          name: 'IndoWings Aerial Logistics',
          description: `Drone Delivery: ${packageType} (${weightNum} kg)`,
          image: '/indowings-logo-mobile.svg',
          order_id: gatewayOrder.id,
          prefill: {
            name: contactName || currentUser.name,
            email: contactEmail || currentUser.email,
            contact: (contactPhone || currentUser.phone || '').replace(/[^0-9]/g, '').slice(-10)
          },
          theme: {
            color: '#3b0080'
          },
          handler: async function (response: any) {
            try {
              const verification = await apiClient.verifyPayment(
                payment.payment.payment_id,
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
              if (!verification.success) throw new Error('Payment was not confirmed by the payment provider.');
              setSuccessOrder({ ...order, fare_inr: totalFare, payment_id: response.razorpay_payment_id });
            } catch (err: any) {
              setError(err.message || 'Payment recorded but order registration failed.');
            } finally {
              setLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              apiClient.cancelOrder(order.id, 'Customer closed payment checkout').catch(() => {});
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setLoading(false);
          setError(`Payment Failed: ${resp.error?.description || 'Transaction cancelled'}`);
        });
        rzp.open();
      } else {
        await apiClient.cancelOrder(order.id, 'Payment checkout could not be loaded');
        throw new Error('Payment checkout is unavailable. The order was cancelled; choose Cash on Delivery or retry later.');
      }
    } catch (err: any) {
      if (paymentOrderRecord) {
        await apiClient.cancelOrder(paymentOrderRecord.id, 'Payment could not be initialized').catch(() => {});
      }
      setError(err.message || 'Payment initiation failed. Please try again.');
      setLoading(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (successOrder) return (
    <div className="min-h-screen bg-[#f7f4fb] pb-20">
      {/* Hero Header */}
      <section 
        className="relative text-white pt-12 pb-24 px-6 overflow-hidden text-center" 
        style={{ background: 'linear-gradient(135deg, #1e0940 0%, #2b114d 55%, #1a0835 100%)' }}>
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />
        <div className="relative max-w-2xl mx-auto">
          {/* Animated Glowing Success Badge */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-950/40">
            <Check className="w-8 h-8 text-emerald-400 stroke-[3]" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
            {successOrder.payment_method === 'cod' ? 'Delivery Order Placed' : 'Payment Verified & Order Placed'}
          </h1>
          <p className="text-white/70 text-sm max-w-md mx-auto">
            {successOrder.payment_method === 'cod'
              ? 'Your delivery request is in the operations queue. Payment is due on arrival.'
              : `Transaction: ${successOrder.payment_id || 'Verified'} • Your order is in the operations queue.`}
          </p>
        </div>
      </section>

      {/* Main Order Confirmation Card */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-12 relative z-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
          
          {/* Top Payment Status Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              {successOrder.payment_method === 'cod' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800">
                  <Banknote className="w-3.5 h-3.5 text-amber-600" />
                  Cash on Delivery (Pay ₹{successOrder.fare_inr || totalFare})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Payment Confirmed (₹{successOrder.fare_inr || totalFare})
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Verified Order
            </span>
          </div>

          {/* Tracking ID & Assigned Drone Hero Box */}
          <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-5 mb-6 text-center">
            <p className="text-[11px] font-bold text-purple-700 uppercase tracking-widest mb-1.5">
              Assigned Air Tracking ID
            </p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-3xl sm:text-4xl font-black text-[#3b0080] tracking-tight font-mono">
                {successOrder.id}
              </span>
              <button
                type="button"
                onClick={() => handleCopyTrackingId(successOrder.id)}
                title="Copy Tracking ID"
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#3b0080] hover:bg-white transition-all">
                {copiedId ? <CheckCheck className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1 rounded-full border border-purple-200/60 shadow-2xs text-xs">
              <Truck className="w-3.5 h-3.5 text-[#3b0080]" />
              <span className="font-bold text-slate-700">
                {successOrder.drone_id ? `Assigned UAV: ${successOrder.drone_id} (${successOrder.drone_model})` : 'UAV auto-allocation in progress'}
              </span>
            </div>
          </div>

          {/* Route Info: Pickup & Drop */}
          <div className="bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 space-y-3">
            <div className="flex items-start gap-3 text-left">
              <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup Location</p>
                <p className="text-sm font-semibold text-[#171222] truncate">{successOrder.pickup_address}</p>
              </div>
            </div>

            <div className="border-l-2 border-dashed border-purple-200 ml-3 pl-6 py-0.5 text-xs text-slate-400 font-medium">
              Direct Air Path ~{successOrder.aerial_distance_km || aerialDistKm} km • ETA ~{successOrder.flight_duration_mins || flightMins} mins
            </div>

            <div className="flex items-start gap-3 text-left">
              <div className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-700 shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drop Destination</p>
                <p className="text-sm font-semibold text-[#171222]">{successOrder.drop_address}</p>
              </div>
            </div>
          </div>

          {/* Recipient Details if exists */}
          {successOrder.recipient_name && (
            <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 mb-6 text-left flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#3b0080] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-purple-100">
                  Recipient Contact
                </span>
                <p className="text-sm font-bold text-[#171222] mt-1.5">{successOrder.recipient_name}</p>
                {successOrder.delivery_notes && (
                  <p className="text-xs text-slate-500 italic mt-0.5">
                    Instructions: &ldquo;{successOrder.delivery_notes}&rdquo;
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-slate-700 block">{successOrder.recipient_phone}</span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 justify-end mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> SMS alerts active
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => { onNavigate('track'); window.history.pushState({}, '', `/track?id=${successOrder.id}`); }}
              className="flex-1 flex items-center justify-center gap-2 bg-[#3b0080] hover:bg-[#2a005c] text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-98">
              <MapPin className="w-4 h-4" /> Track Live Flight
            </button>
            <button
              type="button"
              onClick={() => { setSuccessOrder(null); window.scrollTo({ top: 0, behavior: 'instant' }); }}
              className="flex-1 flex items-center justify-center gap-2 border border-slate-200 hover:border-[#3b0080] text-slate-700 hover:text-[#3b0080] font-semibold py-3.5 rounded-xl transition-all hover:bg-purple-50/40">
              Dispatch Another Delivery
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f4fb]">
      {/* Hero */}
      <section className="relative text-white pt-16 pb-20 px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e0940 0%, #2b114d 50%, #1a0835 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-4xl mx-auto">
          <div className="w-14 h-14 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center mb-5">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/70 mb-3">Drone Delivery Dispatch</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight max-w-xl">Instant aerial courier across Delhi NCR</h1>
          <p className="text-white/70 text-base max-w-xl leading-relaxed">
            Standard 24-minute flight corridors. Pay securely via Razorpay UPI, Cards, or NetBanking.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Support & Pre-flight Guidance Helper */}
        <div className="mb-6 bg-gradient-to-r from-purple-50 via-white to-blue-50 border border-purple-100/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3b0080]/10 flex items-center justify-center text-[#3b0080] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Unsure about terrace landing or weight limits?</p>
              <p className="text-[11px] text-slate-500">DGCA guidelines require 3×3m clear terrace & max 5kg payload.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <a
              href="/support?tab=expert"
              onClick={(e) => { e.preventDefault(); onNavigate('support'); window.history.pushState({}, '', '/support?tab=expert'); }}
              className="px-2.5 py-1.5 bg-white border border-purple-200 hover:border-[#3b0080] text-[#3b0080] font-semibold rounded-lg shadow-xs hover:bg-purple-50 transition-all flex items-center gap-1"
            >
              Talk to Expert
            </a>
            <a
              href="/support?tab=guide"
              onClick={(e) => { e.preventDefault(); onNavigate('support'); window.history.pushState({}, '', '/support?tab=guide'); }}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-medium rounded-lg shadow-xs hover:bg-slate-50 transition-all"
            >
              Customer Guide
            </a>
            <a
              href="/support?tab=fix"
              onClick={(e) => { e.preventDefault(); onNavigate('support'); window.history.pushState({}, '', '/support?tab=fix'); }}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-medium rounded-lg shadow-xs hover:bg-slate-50 transition-all hidden md:inline-flex"
            >
              Fix & Troubleshoot Guide
            </a>
          </div>
        </div>

        {!currentUser && (
          <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-sm text-amber-700 flex-1">Please sign in with your phone OTP to place a delivery order</p>
            <button onClick={onOpenAuth} className="text-sm font-bold text-[#3b0080] hover:underline">Sign In Now →</button>
          </div>
        )}

        <form onSubmit={handlePayAndOrder}>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-5">
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#171222]">Aerial Transit Route</h2>
                    <p className="text-xs text-slate-400">Autonomous Point-to-Point UAV Flight Corridor</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-700 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>DGCA Green Zone</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* ── TRANSIT ROUTE CONTAINER (CONNECTED PICKUP & DROP) ── */}
                  <div className="space-y-4">
                    {/* PICKUP POINT (DEPARTURE) */}
                    <div className="relative" ref={pickupRef}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs"></span>
                          <span>Pickup Point (Departure Hub)</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleDetectCurrentLocation}
                          disabled={isLocating}
                          className="text-[11px] font-bold text-[#3b0080] hover:text-[#280058] flex items-center gap-1.5 cursor-pointer bg-purple-50 hover:bg-purple-100 border border-purple-200/80 px-2.5 py-1 rounded-lg transition-colors shadow-2xs">
                          {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3 text-[#3b0080]" />}
                          <span>{isLocating ? 'Locating...' : 'GPS Auto-Detect'}</span>
                        </button>
                      </div>

                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                        <input
                          value={pickup}
                          onFocus={() => { setActiveSearchField('pickup'); if (pickup.length >= 2) setShowPickupDropdown(true); }}
                          onChange={e => { setPickup(e.target.value); setSelectedPickupAddressId(null); setActiveSearchField('pickup'); }}
                          required
                          placeholder="Search departure address, hub or society..."
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 focus:border-emerald-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                        />
                      </div>

                      {/* Autocomplete Suggestions Dropdown */}
                      {showPickupDropdown && pickupSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden max-h-56 overflow-y-auto">
                          <div className="p-2 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-[#3b0080]" />
                            <span>Location Suggestions</span>
                          </div>
                          {pickupSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setPickup(item.short_name || item.name || item.display_name.split(',')[0]);
                                setPickupCoords({ lat: item.lat, lng: item.lng });
                                setSelectedPickupAddressId(null);
                                setShowPickupDropdown(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-2.5 cursor-pointer">
                              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#171222] truncate">{item.short_name || item.name || item.display_name.split(',')[0]}</p>
                                <p className="text-[11px] text-slate-400 truncate">{item.display_name || item.type}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quick Pickup Selector Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <span className="text-[11px] font-bold text-slate-400 mr-0.5">Saved Places:</span>
                        {savedAddresses.map((addr) => {
                          const isSelected = selectedPickupAddressId === addr.id || (Boolean(pickup) && Boolean(addr.full_address) && pickup.includes(addr.full_address));
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => handleApplyAddress(addr, 'pickup')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                                  : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200'
                              }`}>
                              {addr.label === 'Home' && <Home className="w-3 h-3" />}
                              {addr.label === 'Work' && <Building2 className="w-3 h-3" />}
                              {addr.label === 'Office' && <Building2 className="w-3 h-3" />}
                              {addr.label === 'Warehouse' && <Package2 className="w-3 h-3" />}
                              {addr.label === 'Other' && <MapPin className="w-3 h-3" />}
                              <span>{addr.label}</span>
                              {isSelected && <Check className="w-3 h-3" />}
                            </button>
                          );
                        })}

                        {/* Verified Hub shortcut for pickup */}
                        <button
                          type="button"
                          onClick={() => {
                            setPickup('Sector 62 IndoWings Hub, Noida');
                            setPickupCoords({ lat: 28.6280, lng: 77.3649 });
                            setSelectedPickupAddressId(null);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            pickup.includes('Sector 62')
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                          <span>Noida Sec 62</span>
                        </button>
                      </div>
                    </div>

                    {/* ROUTE DIVIDER WITH SWAP BUTTON */}
                    <div className="relative flex items-center justify-center my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-dashed border-slate-200"></div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSwapRoute}
                        title="Swap Departure and Destination"
                        className="relative z-10 px-4 py-1.5 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-[#3b0080] rounded-full text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer">
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#3b0080]" />
                        <span>Swap Direction</span>
                      </button>
                    </div>

                    {/* DROP DESTINATION (DELIVERY) */}
                    <div className="relative" ref={dropRef}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block shadow-xs"></span>
                          <span>Drop Destination (Delivery Zone)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => { onNavigate('profile'); window.history.pushState({}, '', '/profile'); }}
                          className="text-[11px] font-bold text-[#3b0080] hover:text-[#280058] flex items-center gap-1 hover:underline cursor-pointer">
                          <span>Manage Addresses</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600" />
                        <input
                          value={drop}
                          onFocus={() => { setActiveSearchField('drop'); if (drop.length >= 2) setShowDropDropdown(true); }}
                          onChange={e => { setDrop(e.target.value); setSelectedAddressId(null); setActiveSearchField('drop'); }}
                          required
                          placeholder="Search delivery address, building or landmark..."
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 focus:border-[#3b0080] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all bg-white"
                        />
                      </div>

                      {/* Autocomplete Suggestions Dropdown */}
                      {showDropDropdown && dropSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden max-h-56 overflow-y-auto">
                          <div className="p-2 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-[#3b0080]" />
                            <span>Location Suggestions</span>
                          </div>
                          {dropSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setDrop(item.short_name || item.name || item.display_name.split(',')[0]);
                                setDropCoords({ lat: item.lat, lng: item.lng });
                                setSelectedAddressId(null);
                                setShowDropDropdown(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-purple-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-2.5 cursor-pointer">
                              <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#171222] truncate">{item.short_name || item.name || item.display_name.split(',')[0]}</p>
                                <p className="text-[11px] text-slate-400 truncate">{item.display_name || item.type}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quick Drop Selector: Row 1 Saved Places */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <span className="text-[11px] font-bold text-slate-400 mr-0.5">Saved Places:</span>
                        {savedAddresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id || (Boolean(drop) && Boolean(addr.full_address) && drop.includes(addr.full_address));
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => handleApplyAddress(addr, 'drop')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#3b0080] text-white shadow-xs ring-2 ring-purple-200'
                                  : 'bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-[#3b0080] border border-slate-200 hover:border-purple-200'
                              }`}>
                              {addr.label === 'Home' && <Home className="w-3 h-3" />}
                              {addr.label === 'Work' && <Building2 className="w-3 h-3" />}
                              {addr.label === 'Office' && <Building2 className="w-3 h-3" />}
                              {addr.label === 'Warehouse' && <Package2 className="w-3 h-3" />}
                              {addr.label === 'Other' && <MapPin className="w-3 h-3" />}
                              <span>{addr.label}</span>
                              {isSelected && <Check className="w-3 h-3" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Quick Drop Selector: Row 2 NCR Verified Hubs */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span className="text-[11px] font-bold text-slate-400 mr-0.5">NCR Hubs:</span>
                        {POPULAR_HUBS.map((hub, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setDrop(hub.name);
                              setDropCoords({ lat: hub.lat, lng: hub.lng });
                              setSelectedAddressId(null);
                            }}
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-lg transition-all cursor-pointer border ${
                              drop.includes(hub.short) || drop === hub.name
                                ? 'bg-purple-100 text-[#3b0080] border-purple-300 font-bold'
                                : 'bg-slate-50 hover:bg-purple-50/60 text-slate-600 hover:text-[#3b0080] border-slate-200'
                            }`}
                            title={hub.name}>
                            <span>{hub.short}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── 3-METRIC AVIATION TELEMETRY HUB ───────────────────────────── */}
                    <div className="bg-gradient-to-br from-purple-50/60 via-white to-emerald-50/40 border border-purple-100/90 rounded-2xl p-4 shadow-xs mt-3">
                      {/* Top Metric Strip */}
                      <div className="grid grid-cols-3 gap-2 divide-x divide-slate-200/80 text-center pb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Air Distance</span>
                          <span className="text-base sm:text-lg font-black text-[#171222] font-mono leading-none">~{aerialDistKm} km</span>
                          <span className="text-[10px] text-slate-500 font-medium block mt-1">Geodesic Vector</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Flight ETA</span>
                          <span className="text-base sm:text-lg font-black text-[#3b0080] font-mono leading-none whitespace-nowrap">~{flightMins} mins</span>
                          <span className="text-[10px] text-purple-600 font-medium block mt-1">Cruise 65 km/h</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Airspace</span>
                          <span className="text-base sm:text-lg font-black text-emerald-600 font-mono leading-none whitespace-nowrap">Green Zone</span>
                          <span className="text-[10px] text-emerald-700 font-medium block mt-1">&lt;120m AGL Clear</span>
                        </div>
                      </div>

                      {/* Interactive Calculation Explainer Trigger */}
                      <button
                        type="button"
                        onClick={() => setShowCalcExplainer(!showCalcExplainer)}
                        className="w-full pt-2.5 border-t border-purple-100/70 flex items-center justify-between text-[11px] font-bold text-[#3b0080] hover:text-[#280058] transition-colors cursor-pointer">
                        <span className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-[#3b0080]" />
                          <span>How are KM, ETA & Green Zone calculated?</span>
                        </span>
                        {showCalcExplainer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* Expandable Breakdown Drawer */}
                      {showCalcExplainer && (
                        <div className="mt-3 pt-3 border-t border-purple-100/70 text-xs text-slate-600 space-y-2 animate-in fade-in slide-in-from-top-1">
                          <div className="p-3 bg-white/90 rounded-xl border border-purple-100 space-y-2 shadow-2xs">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-[#3b0080] shrink-0 text-xs">📏 Air Distance (~{aerialDistKm} km):</span>
                              <span className="text-[11px] leading-relaxed text-slate-600">
                                Calculated using the <strong>Haversine Geodesic GPS formula</strong> directly connecting Pickup & Drop coordinates. Drones fly in an unobstructed 3D straight-line vector, bypassing traffic jams, winding roads and red lights.
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-[#3b0080] shrink-0 text-xs">⏱️ Flight ETA (~{flightMins} mins):</span>
                              <span className="text-[11px] leading-relaxed text-slate-600">
                                Calculated as <strong>(Distance ÷ 65 km/h UAV cruise speed) × 60 mins + 4 mins</strong> buffer (vertical takeoff, climb to 90m cruise altitude, descent and precision winch tether drop).
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-emerald-700 shrink-0 text-xs">🟢 DGCA Green Zone:</span>
                              <span className="text-[11px] leading-relaxed text-slate-600">
                                Under India's Ministry of Civil Aviation DigitalSky rules, airspace up to <strong>120 meters (400 ft) AGL</strong> outside airport perimeters is designated <strong>Green Zone</strong> — meaning autonomous civilian delivery flights require <strong>zero prior ATC permissions</strong>.
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Booking contact details */}
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 mb-3">Booking Contact Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Name
                        <input value={contactName} onChange={e => setContactName(e.target.value)} required placeholder="Full name" className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 normal-case" />
                      </label>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Email
                        <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required placeholder="name@example.com" className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 normal-case" />
                      </label>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Mobile
                        <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} required={!isOrderingForSomeoneElse} placeholder="10-digit mobile" className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 normal-case" />
                      </label>
                    </div>
                  </div>

                  {/* 3. Order for Someone Else / New Recipient Address Section */}
                  <div className="pt-4 border-t border-slate-100">
                    <div 
                      onClick={() => setIsOrderingForSomeoneElse(!isOrderingForSomeoneElse)}
                      className="flex items-center justify-between cursor-pointer p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          isOrderingForSomeoneElse ? 'bg-[#3b0080] text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#171222]">Deliver to someone else?</p>
                          <p className="text-[11px] text-slate-500">Send package to a friend, client, family or alternate drop recipient</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isOrderingForSomeoneElse}
                        onChange={(e) => setIsOrderingForSomeoneElse(e.target.checked)}
                        className="w-4 h-4 text-[#3b0080] rounded accent-[#3b0080] cursor-pointer"
                      />
                    </div>

                    {isOrderingForSomeoneElse && (
                      <div className="mt-3 p-4 bg-purple-50/40 border border-purple-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#3b0080]">
                          <HeartHandshake className="w-4 h-4" />
                          <span>Recipient Contact Details (For SMS Alert on UAV Landing)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Recipient Full Name *
                            </label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                value={recipientName}
                                onChange={e => setRecipientName(e.target.value)}
                                required={isOrderingForSomeoneElse}
                                placeholder="e.g. Rahul Sharma"
                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Recipient Mobile Phone *
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                value={recipientPhone}
                                onChange={e => setRecipientPhone(e.target.value)}
                                required={isOrderingForSomeoneElse}
                                placeholder="10-digit mobile (e.g. 9876543210)"
                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Delivery Notes / Drop Zone Instructions (Optional)
                          </label>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <textarea
                              value={deliveryNotes}
                              onChange={e => setDeliveryNotes(e.target.value)}
                              rows={2}
                              placeholder="e.g. Leave package with Gate 2 security or land at terrace helipad spot"
                              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#171222] mb-4">Package Specifications</h2>
                <div className="space-y-4">
                  <select
                    value={packageType}
                    onChange={e => setPackageType(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100 bg-white">
                    {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="relative">
                    <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="5"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      required
                      placeholder="Weight in kg (max 5 kg)"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Standard payload allowance: up to 5kg per flight via Cyberone UAV.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#171222] mb-4">Dispatch Schedule</h2>
                <div className="flex gap-3 mb-4">
                  {(['now', 'later'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScheduleMode(s)}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                        scheduleMode === s ? 'border-[#3b0080] bg-purple-50 text-[#3b0080]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      {s === 'now' ? '⚡ Instant Dispatch' : '🕐 Schedule Later'}
                    </button>
                  ))}
                </div>
                {scheduleMode === 'later' && (
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                )}
              </div>

              {/* Pricing & Checkout Summary Card */}
              <div className="bg-white border-2 border-purple-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-[#171222]">Fare Estimate</h2>
                  <span className="text-xs font-bold text-[#3b0080] bg-purple-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Live Quote
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 mb-5">
                  <div className="flex justify-between">
                    <span>Base Drone Dispatch Fee</span>
                    <span className="font-semibold text-[#171222]">₹{baseFare}</span>
                  </div>
                  {extraWeightFee > 0 && (
                    <div className="flex justify-between">
                      <span>Extra Payload Surcharge (+{(weightNum - 1).toFixed(1)}kg)</span>
                      <span className="font-semibold text-[#171222]">₹{extraWeightFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Airspace Navigation & Insurance</span>
                    <span className="font-semibold text-green-600">INCLUDED</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2.5 flex justify-between text-sm">
                    <span className="font-bold text-[#171222]">Total Payable</span>
                    <span className="font-bold text-xl text-[#3b0080]">₹{totalFare}</span>
                  </div>
                </div>

                {/* Payment Mode Selector: Online vs Cash on Delivery */}
                <div className="mb-5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        paymentMethod === 'online'
                          ? 'border-[#3b0080] bg-purple-50/70 ring-2 ring-purple-100'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#171222]">
                        <CreditCard className="w-3.5 h-3.5 text-[#3b0080]" />
                        <span>Online UPI / Card</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Instant via Razorpay</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-[#3b0080] bg-purple-50/70 ring-2 ring-purple-100'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#171222]">
                        <Banknote className="w-3.5 h-3.5 text-green-600" />
                        <span>Cash on Delivery</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Pay on payload arrival</p>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#3b0080] hover:bg-[#2d006b] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-70 text-base shadow-lg shadow-purple-900/15">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{paymentMethod === 'cod' ? 'Confirming Dispatch...' : 'Initializing Secure Gateway...'}</span>
                    </>
                  ) : paymentMethod === 'cod' ? (
                    <>
                      <Banknote className="w-5 h-5 text-amber-300" />
                      <span>Confirm COD Dispatch (₹{totalFare})</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Pay ₹{totalFare} & Dispatch Drone</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  <span>
                    {paymentMethod === 'cod' 
                      ? 'Pay cash/UPI at destination drop zone upon arrival' 
                      : 'Secured with Razorpay 256-Bit SSL Encryption'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};