import { useState } from 'react';
import ZFLogo from './ZFLogo';
import { changePassword, passwordIssues } from '../utils/auth';

/**
 * Shown when an account is flagged `mustChangePassword` — on first sign-in,
 * after an admin reset, or once the password expiry window has elapsed.
 */
export default function ChangePassword({ user, policy, onDone, onCancel }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const issues = passwordIssues(next, policy);
  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = current && next && confirm && !issues.length && !mismatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await changePassword(current, next);
      onDone(result.user);
    } catch (err) {
      setError(err.message || 'Could not change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="loginPage">
      <div className="login-right" style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="lc-head" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div className="login-badge-icon">
                <ZFLogo size={22} color="#1F5FAE" title="ZF India" />
              </div>
            </div>
            <h2>Set a new password</h2>
            <p>
              {onCancel
                ? 'Choose a new password for your account.'
                : `Welcome, ${user?.fullName || user?.username}. You must set a new password before continuing.`}
            </p>
          </div>

          <div className="fg">
            <label>Current password</label>
            <input
              type="password"
              value={current}
              onChange={(e) => { setCurrent(e.target.value); setError(''); }}
              autoComplete="current-password"
              autoFocus
              disabled={busy}
            />
          </div>

          <div className="fg">
            <label>New password</label>
            <input
              type="password"
              value={next}
              onChange={(e) => { setNext(e.target.value); setError(''); }}
              autoComplete="new-password"
              disabled={busy}
            />
          </div>

          <div className="fg">
            <label>Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              className={mismatch ? 'error' : ''}
              autoComplete="new-password"
              disabled={busy}
            />
          </div>

          {policy && (
            <ul className="pw-policy">
              {[
                `At least ${policy.minLength} characters`,
                policy.requireUppercase && 'An uppercase letter',
                policy.requireNumber && 'A number',
                policy.requireSymbol && 'A symbol',
              ]
                .filter(Boolean)
                .map((rule) => (
                  <li key={rule} className={next && !issues.includes(rule) ? 'ok' : ''}>
                    {next && !issues.includes(rule) ? '✓' : '•'} {rule}
                  </li>
                ))}
            </ul>
          )}

          {mismatch && <div className="login-err">Passwords do not match</div>}
          {error && <div className="login-err">{error}</div>}

          <button type="submit" className="btn-login" disabled={!ready || busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>

          {onCancel && (
            <button
              type="button"
              className="btn-sm btn-outline"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
