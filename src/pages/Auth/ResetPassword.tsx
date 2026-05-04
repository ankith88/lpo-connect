import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  verifyPasswordResetCode, 
  confirmPasswordReset 
} from 'firebase/auth';
import { auth } from '../../firebase/config';
import { Lock, CheckCircle, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import LoadingScreen from '../../components/LoadingScreen';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verifyCode = async () => {
      if (mode !== 'resetPassword' || !oobCode) {
        setError('Invalid or expired reset link. Please request a new one.');
        setVerifying(false);
        setLoading(false);
        return;
      }

      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setVerifying(false);
        setLoading(false);
      } catch (err: any) {
        console.error("Verification error:", err);
        setError('This reset link has expired or has already been used.');
        setVerifying(false);
        setLoading(false);
      }
    };

    verifyCode();
  }, [mode, oobCode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setSuccess(true);
    } catch (err: any) {
      console.error("Reset error:", err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && verifying) {
    return <LoadingScreen message="Verifying Security Code" />;
  }

  return (
    <div className="reset-page">
      <div className="reset-container">
        <div className="reset-card">
          <div className="logo-section">
            <h1 className="brand-logo">LPO<span className="logo-plus">.plus</span></h1>
            <p className="powered-by">Powered by MailPlus</p>
          </div>

          {!success ? (
            <>
              <div className="header-text">
                <ShieldCheck size={40} className="header-icon" />
                <h2>Reset Your Password</h2>
                {email && <p className="email-hint">For <strong>{email}</strong></p>}
              </div>

              {error ? (
                <div className="error-state">
                  <div className="error-message">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                  </div>
                  <Link to="/signin" className="back-btn">
                    Return to Sign In
                  </Link>
                </div>
              ) : (
                <form className="reset-form" onSubmit={handleResetPassword}>
                  <div className="input-group">
                    <label htmlFor="newPassword">New Password</label>
                    <div className="input-wrapper">
                      <Lock size={20} />
                      <input 
                        id="newPassword"
                        type="password" 
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="input-wrapper">
                      <Lock size={20} />
                      <input 
                        id="confirmPassword"
                        type="password" 
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="reset-btn" disabled={loading}>
                    {loading ? 'Updating...' : 'Reset Password'}
                    {!loading && <ArrowRight size={20} />}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="success-state">
              <div className="success-icon-wrapper">
                <CheckCircle size={60} />
              </div>
              <h2>Password Updated</h2>
              <p>Your password has been reset successfully. You can now sign in with your new password.</p>
              <button 
                onClick={() => navigate('/signin')} 
                className="signin-redirect-btn"
              >
                Sign In Now
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .reset-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--offwhite);
          padding: 20px;
        }

        .reset-container {
          width: 100%;
          max-width: 440px;
        }

        .reset-card {
          background: var(--paper);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 10px 40px rgba(26, 61, 51, 0.1);
        }

        .logo-section {
          text-align: center;
          margin-bottom: 32px;
        }

        .brand-logo {
          font-family: var(--font-headings);
          font-size: 2.2rem;
          font-weight: 400;
          color: var(--ink);
          letter-spacing: -0.025em;
          margin-bottom: 4px;
        }
        
        .brand-logo .logo-plus {
          color: var(--yellow);
          font-family: var(--font-headings);
          font-weight: 500;
          font-style: italic;
        }

        .powered-by {
          font-family: var(--font-ui);
          font-size: 0.6rem;
          font-weight: 500;
          color: var(--ink-soft);
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .header-text {
          text-align: center;
          margin-bottom: 32px;
        }

        .header-icon {
          color: var(--gold);
          margin-bottom: 16px;
        }

        .header-text h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--ink);
          margin-bottom: 8px;
        }

        .email-hint {
          font-size: 0.9rem;
          color: var(--ink-soft);
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-group label {
          display: block;
          font-family: var(--font-ui);
          font-size: 0.7rem;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--ink);
          text-transform: uppercase;
          letter-spacing: 0.16em;
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
          width: 100%;
          padding: 12px 12px 12px 45px;
          border-radius: 12px;
          border: 1px solid var(--cream-warm);
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .input-wrapper input:focus {
          border-color: var(--gold);
          outline: none;
        }

        .reset-btn {
          width: 100%;
          background: var(--ink);
          color: white;
          padding: 14px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          margin-top: 12px;
        }

        .reset-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-message {
          color: var(--danger);
          font-size: 0.85rem;
          margin-bottom: 20px;
          padding: 12px;
          background: #ffebee;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .back-btn {
          display: block;
          text-align: center;
          color: var(--ink);
          text-decoration: none;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .success-state {
          text-align: center;
        }

        .success-icon-wrapper {
          color: #2e7d32;
          margin-bottom: 20px;
        }

        .success-state h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--ink);
          margin-bottom: 12px;
        }

        .success-state p {
          color: var(--ink-soft);
          margin-bottom: 32px;
          line-height: 1.6;
        }

        .signin-redirect-btn {
          width: 100%;
          background: var(--ink);
          color: white;
          padding: 14px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;
