import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message, 
  fullScreen = true 
}) => {
  const [dots, setDots] = useState('');
  const [statusIdx, setStatusIdx] = useState(0);

  const statuses = [
    "Synchronizing logistics network",
    "Coordinating terminal data",
    "Optimizing routing matrix",
    "Verifying operator availability",
    "Securing encrypted connection",
    "Initializing LPO.PLUS interface"
  ];

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    const statusInterval = setInterval(() => {
      setStatusIdx(prev => (prev + 1) % statuses.length);
    }, 2500);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(statusInterval);
    };
  }, []);

  const containerStyle = fullScreen ? "loading-screen-full" : "loading-screen-inline";

  return (
    <div className={containerStyle}>
      <div className="loading-content">
        <div className="logo-animation-container">
          <div className="logo-pulse"></div>
          <div className="logo-main">
            <span className="logo-lpo">lpo</span>
            <span className="logo-plus">.plus</span>
          </div>
        </div>

        <div className="status-container">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <div className="status-text">
            {message || statuses[statusIdx]}{dots}
          </div>
        </div>
      </div>

      <style>{`
        .loading-screen-full {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: var(--offwhite);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .loading-screen-inline {
          padding: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          max-width: 300px;
          width: 100%;
        }

        .logo-animation-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-main {
          font-family: var(--font-headings);
          font-size: 2.5rem;
          letter-spacing: -0.025em;
          z-index: 2;
          display: flex;
          align-items: baseline;
        }

        .logo-lpo { color: var(--ink); }
        .logo-plus { color: var(--yellow); font-style: italic; font-weight: 500; }

        .logo-pulse {
          position: absolute;
          width: 80px;
          height: 80px;
          border: 2px solid var(--gold);
          border-radius: 50%;
          animation: pulse-out 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          z-index: 1;
        }

        @keyframes pulse-out {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }

        .status-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
        }

        .progress-bar {
          width: 100%;
          height: 2px;
          background: rgba(26, 61, 51, 0.05);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          position: absolute;
          width: 40%;
          height: 100%;
          background: var(--gold);
          animation: slide-infinite 1.5s ease-in-out infinite;
        }

        @keyframes slide-infinite {
          0% { left: -40%; }
          100% { left: 100%; }
        }

        .status-text {
          font-family: var(--font-ui);
          font-size: 0.65rem;
          color: var(--ink-soft);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-weight: 600;
          text-align: center;
          min-height: 1.2em;
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
