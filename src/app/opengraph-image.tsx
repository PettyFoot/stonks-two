import { ImageResponse } from 'next/og';
import { SEO_CONFIG } from '@/lib/seo';

export const runtime = 'edge';
export const alt = 'Trading Analytics Platform - Professional Trade Metrics & Performance Tracking';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: 'Inter, system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.1,
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              width: 120,
              height: 120,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '30px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <svg
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 3v18h18M7 16l4-4 4 4 6-6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17 8h4v4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0 0 20px 0',
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
            }}
          >
            Trading Analytics
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '28px',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: '0 0 30px 0',
              lineHeight: '1.3',
              maxWidth: '800px',
            }}
          >
            Professional Trade Metrics & Performance Tracking
          </p>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '40px',
              marginTop: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
              <span style={{ fontSize: '18px' }}>✓ Real-time P&L</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
              <span style={{ fontSize: '18px' }}>✓ Advanced Reports</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
              <span style={{ fontSize: '18px' }}>✓ Broker Integration</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}