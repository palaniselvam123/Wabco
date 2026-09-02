import { useCallback, useEffect, useState } from 'react';
import Login from './components/Login';
import Navbar from './components/Navbar';
import LoadingOverlay from './components/LoadingOverlay';
import Dashboard from './components/Dashboard';
import ActiveShipments from './components/ActiveShipments';
import DeliveredShipments from './components/DeliveredShipments';
import Sidebar from './components/Sidebar';
import UserMaster from './components/UserMaster';
import SecurityMaster from './components/SecurityMaster';
import AdminOverview from './components/AdminOverview';
import ConfirmUpload from './components/ConfirmUpload';
import ChangePassword from './components/ChangePassword';
import { DEF_ACTIVE, DEF_DELIVERED } from './data/defaults';
import { readExcelFile } from './utils/excel';
import { computeStats } from './utils/stats';
import { loadShipmentData, saveShipmentData } from './utils/storage';
import { mergeShipmentData } from './utils/merge';
import { can, fetchMe, logout } from './utils/auth';

const INITIAL_STATS = computeStats(DEF_ACTIVE, DEF_DELIVERED, 20);

export default function App() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [sessionNotice, setSessionNotice] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);

  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [uploadBanner, setUploadBanner] = useState('');
  const [activeData, setActiveData] = useState(DEF_ACTIVE);
  const [deliveredData, setDeliveredData] = useState(DEF_DELIVERED);
  const [stats, setStats] = useState(INITIAL_STATS);

  const reportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  /* Restore an existing session on page load. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetchMe();
      if (cancelled) return;
      if (me?.user) {
        setUser(me.user);
        setSettings(me.settings);
      }
      setBooting(false);
    })();
    return () => { cancelled = true; };
  }, []);

  /* A 401 anywhere in the app drops us back to the sign-in screen. */
  useEffect(() => {
    const onExpired = (e) => {
      setUser(null);
      setSettings(null);
      setPage('dashboard');
      setSessionNotice(e.detail || 'Your session has ended. Please sign in again.');
    };
    window.addEventListener('zf:session-expired', onExpired);
    return () => window.removeEventListener('zf:session-expired', onExpired);
  }, []);

  /* Shipment data is only fetched once we hold a valid session. */
  useEffect(() => {
    if (!user || user.mustChangePassword) return;
    let cancelled = false;
    (async () => {
      const saved = await loadShipmentData();
      if (cancelled || !saved) return;
      setActiveData(saved.activeData);
      setDeliveredData(saved.deliveredData);
      setStats(computeStats(saved.activeData, saved.deliveredData));
      const label = saved.fileName ? `"${saved.fileName}"` : 'Previous upload';
      setUploadBanner(
        `${label} restored — ${saved.activeData.length} active, ${saved.deliveredData.length} delivered.`
      );
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!uploadBanner) return;
    const t = setTimeout(() => setUploadBanner(''), 9000);
    return () => clearTimeout(t);
  }, [uploadBanner]);

  const handleNavigate = useCallback((pg) => {
    setPage(pg);
    window.scrollTo(0, 0);
  }, []);

  const handleLogin = (result) => {
    setSessionNotice('');
    setUser(result.user);
    setPage('dashboard');
    // `me` carries the live policy; fetch it so password rules are available.
    fetchMe().then((me) => me?.settings && setSettings(me.settings));
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setSettings(null);
    setPage('dashboard');
    setSessionNotice('');
  };

  /** Validates the chosen file, then asks for explicit confirmation. */
  const handleUpload = (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    evt.target.value = '';

    // Client-side gate mirrors the server rules for a fast, clear message.
    if (!can(user, 'upload')) {
      alert('Only administrators can upload shipment data.');
      return;
    }

    const rules = settings?.upload;
    if (rules) {
      const maxBytes = (rules.maxFileSizeMb || 25) * 1024 * 1024;
      if (file.size > maxBytes) {
        alert(
          `"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB, which exceeds the ${rules.maxFileSizeMb} MB limit set in Security Master.`
        );
        return;
      }
      const exts = rules.allowedExtensions || [];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (exts.length && !exts.includes(ext)) {
        alert(`"${ext}" files are not permitted. Allowed types: ${exts.join(', ')}`);
        return;
      }
    }

    // Uploading merges into shared data every user sees, so never act on the
    // file-picker alone — require a deliberate confirmation first.
    setPendingUpload(file);
  };

  const runUpload = async (file) => {
    setPendingUpload(null);
    setLoading(true);
    try {
      const incoming = await readExcelFile(file);
      const merged = mergeShipmentData({ activeData, deliveredData }, incoming);
      const mergedStats = computeStats(merged.activeData, merged.deliveredData);

      setActiveData(merged.activeData);
      setDeliveredData(merged.deliveredData);
      setStats(mergedStats);

      const { newActive, updatedActive, newDelivered, updatedDelivered, movedToDelivered } = merged.summary;
      const parts = [];
      if (newActive) parts.push(`${newActive} new active`);
      if (updatedActive) parts.push(`${updatedActive} active updated`);
      if (newDelivered) parts.push(`${newDelivered} new delivered`);
      if (updatedDelivered) parts.push(`${updatedDelivered} delivered updated`);
      if (movedToDelivered) parts.push(`${movedToDelivered} moved active→delivered`);
      const summary = parts.length ? parts.join(' · ') : 'no changes detected';
      setUploadBanner(
        `"${file.name}" merged — ${summary}. Total: ${merged.activeData.length} active, ${merged.deliveredData.length} delivered.`
      );

      try {
        await saveShipmentData({
          activeData: merged.activeData,
          deliveredData: merged.deliveredData,
          fileName: file.name,
        });
      } catch (persistErr) {
        alert(`Data merged locally but could not be saved: ${persistErr.message}`);
      }
    } catch (err) {
      alert(
        'Error reading file: ' + err.message +
        '\n\nSupported formats: .xlsb, .xlsx, .xls'
      );
    } finally {
      setLoading(false);
    }
  };

  if (booting) return <LoadingOverlay visible />;

  if (!user) {
    return <Login onLogin={handleLogin} notice={sessionNotice} />;
  }

  /* A flagged account cannot reach the app until the password is rotated. */
  if (user.mustChangePassword) {
    return (
      <ChangePassword
        user={user}
        policy={settings?.password}
        onDone={(updated) => setUser(updated)}
      />
    );
  }

  if (changingPassword) {
    return (
      <ChangePassword
        user={user}
        policy={settings?.password}
        onDone={(updated) => { setUser(updated); setChangingPassword(false); }}
        onCancel={() => setChangingPassword(false)}
      />
    );
  }

  const canExport = can(user, 'export');

  return (
    <>
      <LoadingOverlay visible={loading} />
      <Navbar
        onLogout={handleLogout}
        user={user}
        onChangePassword={() => setChangingPassword(true)}
      />

      {pendingUpload && (
        <ConfirmUpload
          file={pendingUpload}
          activeCount={activeData.length}
          deliveredCount={deliveredData.length}
          onConfirm={() => runUpload(pendingUpload)}
          onCancel={() => setPendingUpload(null)}
        />
      )}
      <div className="app-shell">
        <Sidebar
          page={page}
          onNavigate={handleNavigate}
          user={user}
          activeCount={activeData.length}
          deliveredCount={deliveredData.length}
        />
        <main className="app-main">
      {page === 'dashboard' && (
        <Dashboard
          stats={stats}
          activeData={activeData}
          deliveredData={deliveredData}
          reportDate={reportDate}
          uploadBanner={uploadBanner}
          onUpload={handleUpload}
          onNavigate={handleNavigate}
          canUpload={can(user, 'upload')}
          canExport={canExport}
        />
      )}
      {page === 'details' && (
        <ActiveShipments
          activeData={activeData}
          onNavigate={handleNavigate}
          canExport={canExport}
        />
      )}
      {page === 'delivered' && (
        <DeliveredShipments
          deliveredData={deliveredData}
          onNavigate={handleNavigate}
          canExport={canExport}
        />
      )}
      {page === 'admin' && can(user, 'manage_users') && (
        <div className="pg">
          <div className="pg-head">
            <div>
              <div className="pg-title">Administration</div>
              <div className="pg-sub">
                Accounts, roles and recent security activity
              </div>
            </div>
          </div>
          <AdminOverview currentUser={user} onOpenTab={handleNavigate} />
        </div>
      )}
      {page === 'users' && can(user, 'manage_users') && (
        <UserMaster
          currentUser={user}
          policy={settings?.password}
          onNavigate={handleNavigate}
        />
      )}
      {page === 'security' && can(user, 'manage_security') && (
        <SecurityMaster
          onNavigate={handleNavigate}
          onSettingsSaved={(next) =>
            setSettings((prev) => ({
              ...prev,
              password: next.password,
              upload: next.upload,
              session: next.session,
            }))
          }
        />
      )}
        </main>
      </div>
    </>
  );
}
