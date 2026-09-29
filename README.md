# IndoWings Aerial Logistics - Frontend Web Application

Modern, real-time autonomous drone delivery and logistics command center built with React, TypeScript, Vite, Tailwind CSS, and Lucide Icons.

## Features
- **Live Drone Tracking**: Real-time GPS flight simulation, altitude, speed gauges, and interactive radar map.
- **Flight Dispatch & Order Booking**: Instant multi-point corridor routing, aerial distance calculation, and Razorpay integration.
- **AI Copilot & Tracking Chatbot**: Integrated customer support assistant with OTP verification (Twilio SMS & Email) and instant live telemetry HUD.
- **Fleet Showcase**: Specifications and DGCA certifications for Cyberone Pro, Cyberone Max, Cyberone Lite, and S-500 VTOL.
- **Customer & Admin Dashboards**: Order history, live flight cancellation, feedback system, and expert pilot consultations.

## Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Maps & UI**: Leaflet / Custom radar canvas & animated telemetry HUDs

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm run preview
```

## Fleet API Backend

The fleet management API is in [`backend/`](backend/README.md). It uses FastAPI and MongoDB, listens on port `4000`, and is proxied by Vite from `/api/*` on port `3000`. Follow the backend README for Windows PowerShell setup, MongoDB configuration, seeding, authentication, and endpoint details.

Fleet, order, authentication, statistics, payment, and audit requests use relative `/api/*` paths through the Vite proxy. Some legacy customer profile/OTP, feedback, chatbot verification, and support-enquiry actions still require APIs outside the Fleet backend; see [`backend/README.md`](backend/README.md).

