import { useState } from 'react';
import ZFLogo from './ZFLogo';
import { login } from '../utils/auth';

export default function Login({ onLogin, notice }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await login(username.trim(), password);
      onLogin(result);
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="loginPage">
      <div className="login-left">
        <div className="login-badge">
          <div className="login-badge-icon">
            <ZFLogo size={22} color="#1F5FAE" title="ZF India" />
          </div>
          <span>ZF INDIA — AIR &amp; SEA FREIGHT OPERATIONS</span>
        </div>
        <h1 className="login-hero">
          Logistics
          <br />
          Intelligence
          <br />
          <em>Command Center</em>
        </h1>
        <p className="login-desc">
          End-to-end visibility across air freight shipments, customs clearance,
          duty management, and multi-plant delivery operations — FY 2026-27.
        </p>
        <div className="login-stats">
          <div>
            <div className="lst-val">608+</div>
            <div className="lst-lbl">Deliveries FY 26-27</div>
          </div>
          <div className="lst-div" />
          <div>
            <div className="lst-val">29</div>
            <div className="lst-lbl">Active Shipments</div>
          </div>
          <div className="lst-div" />
          <div>
            <div className="lst-val">₹6.8L</div>
            <div className="lst-lbl">Total Duty Value</div>
          </div>
          <div className="lst-div" />
          <div>
            <div className="lst-val">28</div>
            <div className="lst-lbl">Active Suppliers</div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="lc-head">
            <h2>Welcome Back</h2>
            <p>Sign in to access the logistics dashboard</p>
          </div>

          {notice && <div className="login-notice">{notice}</div>}

          <div className="fg">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              autoComplete="username"
              autoFocus
              disabled={busy}
            />
          </div>
          <div className="fg">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className={error ? 'error' : ''}
              autoComplete="current-password"
              disabled={busy}
            />
          </div>
          <button type="submit" className="btn-login" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In to Dashboard →'}
          </button>
          {error && <div className="login-err">{error}</div>}
          <div className="login-hint">
            Access is managed by your administrator.
          </div>
        </form>
      </div>
    </div>
  );
}
