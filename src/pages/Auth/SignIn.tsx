import React, { useState, useEffect } from 'react';
import { Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useLpo } from '../../context/LpoContext';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useLpo();
  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log("User already logged in, redirecting to dashboard...");
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log(`Attempting sign in for ${identifier}...`);

    try {
      if (loginMethod === 'email') {
        await signInWithEmailAndPassword(auth, identifier, password);
      } else {
        const email = identifier.includes('@') ? identifier : `${identifier}@lpo.plus`;
        await signInWithEmailAndPassword(auth, email, password);
      }
      console.log("Sign in successful! Redirecting...");
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-container">
        <div className="signin-card">
          <div className="logo-section">
            <h1 className="brand-logo">LPO<span>.PLUS</span></h1>
            <p className="powered-by">Powered by MailPlus</p>
            <p className="welcome-text">Connected Logistics for LPOs</p>
          </div>

          <form className="signin-form" onSubmit={handleSignIn}>
            <div className="method-toggle">
              <button 
                type="button"
                className={loginMethod === 'email' ? 'active' : ''}
                onClick={() => setLoginMethod('email')}
              >
                <Mail size={18} /> Email
              </button>
              <button 
                type="button"
                className={loginMethod === 'mobile' ? 'active' : ''}
                onClick={() => setLoginMethod('mobile')}
              >
                <Phone size={18} /> Mobile
              </button>
            </div>

            <div className="input-group">
              <label htmlFor="identifier">
                {loginMethod === 'email' ? 'Email Address' : 'Mobile Number'}
              </label>
              <div className="input-wrapper">
                {loginMethod === 'email' ? <Mail size={20} /> : <Phone size={20} />}
                <input 
                  id="identifier"
                  type={loginMethod === 'email' ? 'email' : 'tel'} 
                  placeholder={loginMethod === 'email' ? 'Enter your email' : 'Enter your mobile'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={20} />
                <input 
                  id="password"
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="signin-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <p className="footer-link">
            Trouble signing in? <a href="#">Contact Support</a>
          </p>
        </div>
      </div>

      <style>{`
        .signin-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--mailplus-light-green);
          padding: 20px;
        }

        .signin-container {
          width: 100%;
          max-width: 440px;
        }

        .signin-card {
          background: white;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 10px 40px rgba(0, 65, 65, 0.1);
        }

        .logo-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .brand-logo {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--mailplus-teal);
          letter-spacing: -1px;
        }

        .brand-logo span {
          color: var(--mailplus-yellow);
        }

        .powered-by {
          font-size: 0.9rem;
          font-weight: 600;
          color: #888;
          margin-top: -10px;
          margin-bottom: 12px;
        }

        .welcome-text {
          color: #666;
          font-weight: 500;
          margin-top: 4px;
        }

        .method-toggle {
          display: flex;
          background: #f0f4f0;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .method-toggle button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: transparent;
          color: #666;
          font-size: 0.9rem;
        }

        .method-toggle button.active {
          background: white;
          color: var(--mailplus-teal);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-group label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--mailplus-teal);
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }

        .input-wrapper input {
          padding-left: 45px;
        }

        .error-message {
          color: var(--mailplus-red);
          font-size: 0.85rem;
          margin-bottom: 20px;
          padding: 10px;
          background: #ffebee;
          border-radius: 8px;
        }

        .signin-btn {
          width: 100%;
          background: var(--mailplus-teal);
          color: white;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 1.1rem;
          margin-bottom: 24px;
        }

        .signin-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .footer-link {
          text-align: center;
          font-size: 0.9rem;
          color: #666;
        }

        .footer-link a {
          color: var(--mailplus-teal);
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
};

export default SignIn;
