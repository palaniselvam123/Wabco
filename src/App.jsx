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

const INITIAL_STATS = computeStats(DEF_ACTIVE, DEF_DELIVERED, 20);

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(false);
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
      const result = await readExcelFile(file);
      setActiveData(result.activeData);
      setDeliveredData(result.deliveredData);
      setStats(result.stats);
      setUploadBanner(result.message);
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
      <LoadingOverlay visible={loading} />
      <Navbar page={page} onNavigate={handleNavigate} onLogout={handleLogout} />
      {page === 'dashboard' && (
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
      {page === 'details' && (
        <ActiveShipments activeData={activeData} onNavigate={handleNavigate} />
      )}
      {page === 'delivered' && (
        <DeliveredShipments
          deliveredData={deliveredData}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
}
