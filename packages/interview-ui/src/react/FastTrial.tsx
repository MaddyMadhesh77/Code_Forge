import React from 'react';

type Props = {
  onStart?: () => void;
};

export const FastTrial: React.FC<Props> = ({ onStart }) => {
  return (
    <div style={{ padding: 24, fontFamily: 'Inter, Arial, sans-serif' }}>
      <h2>Start a free trial</h2>
      <p>Create an account and run your first interview in under 5 minutes.</p>
      <ol>
        <li>Create account (email or SSO)</li>
        <li>Invite 1 teammate</li>
        <li>Create interview and start</li>
      </ol>
      <button onClick={onStart} style={{ padding: '8px 16px', marginTop: 12 }}>
        Create Trial
      </button>
    </div>
  );
};

export default FastTrial;
