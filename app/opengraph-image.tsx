import { ImageResponse } from 'next/og';

export const alt = 'AcadeGrade — understand your academic progress';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#080B16',
          color: '#F7F8FC',
          padding: '72px 80px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', opacity: 0.72, background: 'radial-gradient(circle at 82% 14%, #302867 0%, transparent 38%)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, fontWeight: 700 }}>
            <div style={{ display: 'flex', width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', background: '#7C74FF', color: '#080B16' }}>A</div>
            AcadeGrade
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 860 }}>
            <div style={{ display: 'flex', color: '#A09AFF', fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Academic progress, made clear</div>
            <div style={{ display: 'flex', marginTop: 22, fontSize: 72, lineHeight: 1.02, fontWeight: 800, letterSpacing: -3 }}>Know where your degree is heading.</div>
            <div style={{ display: 'flex', marginTop: 24, color: '#A7B0C4', fontSize: 27 }}>Results · CGPA &amp; PI · OCR scanning · AI-assisted insights</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
