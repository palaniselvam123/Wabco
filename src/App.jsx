import { useCallback, useEffect, useState } from 'react';
import Login from './components/Login';
import Navbar from './components/Navbar';
import LoadingOverlay from './components/LoadingOverlay';
import Dashboard from './components/Dashboard';
import ActiveShipments from './components/ActiveShipments';
import DeliveredShipments from './components/DeliveredShipments';
import { DEF_ACTIVE, DEF_DELIVERED } from './data/defaults';
import { readExcelFile } from './utils/excel';
import { computeStats } from './utils/stats';
import { loadShipmentData, saveShipmentData } from './utils/storage';
import { mergeShipmentData } from './utils/merge';

const INITIAL_STATS = computeStats(DEF_ACTIVE, DEF_DELIVERED, 20);

export default function App() {
  const [authed, setAuthed] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadShipmentData();
      if (cancelled) return;
      if (saved) {
        setActiveData(saved.activeData);
        setDeliveredData(saved.deliveredData);
        setStats(computeStats(saved.activeData, saved.deliveredData));
        const label = saved.fileName ? `"${saved.fileName}"` : 'Previous upload';
        setUploadBanner(
          `${label} restored — ${saved.activeData.length} active, ${saved.deliveredData.length} delivered.`
        );
      }
      setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!uploadBanner) return;
    const t = setTimeout(() => setUploadBanner(''), 9000);
    return () => clearTimeout(t);
  }, [uploadBanner]);

  const handleNavigate = useCallback((pg) => {
    setPage(pg);
    window.scrollTo(0, 0);
  }, []);

  const handleLogout = () => {
    setAuthed(false);
    setPage('dashboard');
  };

  const handleUpload = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    evt.target.value = '';

    setLoading(true);
    try {
      const incoming = await readExcelFile(file);
      // Merge into current state (already in sync with Netlify Blobs)
      const merged = mergeShipmentData(
        { activeData, deliveredData },
        incoming
      );
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
        console.warn('Could not persist upload:', persistErr);
      }
    } catch (err) {
      alert(
        'Error reading file: ' +
          err.message +
          '\n\nSupported formats: .xlsb, .xlsx, .xls'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  return (
    <>
      <LoadingOverlay visible={loading || booting} />
      <Navbar page={page} onNavigate={handleNavigate} onLogout={handleLogout} />
      {!booting && page === 'dashboard' && (
        <Dashboard
          stats={stats}
          activeData={activeData}
          deliveredData={deliveredData}
          reportDate={reportDate}
          uploadBanner={uploadBanner}
          onUpload={handleUpload}
          onNavigate={handleNavigate}
        />
      )}
      {!booting && page === 'details' && (
        <ActiveShipments activeData={activeData} onNavigate={handleNavigate} />
      )}
      {!booting && page === 'delivered' && (
        <DeliveredShipments
          deliveredData={deliveredData}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}
