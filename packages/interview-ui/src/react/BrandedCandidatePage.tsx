import React from 'react';

type Props = {
  brandName?: string;
  logoUrl?: string;
  candidateName?: string;
};

export const BrandedCandidatePage: React.FC<Props> = ({ brandName = 'Code Forge', logoUrl, candidateName }) => {
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {logoUrl && <img src={logoUrl} alt="logo" style={{ height: 40 }} />}
        <h1 style={{ margin: 0 }}>{brandName} — Interview</h1>
      </header>

      <main style={{ marginTop: 24 }}>
        <h2>Welcome{candidateName ? `, ${candidateName}` : ''}.</h2>
        <p>Your interview will start shortly. Please ensure your microphone and camera are enabled.</p>
        <div style={{ marginTop: 16 }}>
          <button style={{ padding: '8px 16px' }}>Join Interview</button>
        </div>
      </main>
    </div>
  );
};

export default BrandedCandidatePage;
