import { useEffect, useState } from 'react';
import { getAllNotifications } from '../api';

function AllNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [seen, setSeen] = useState(() => JSON.parse(localStorage.getItem('seen') || '[]'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllNotifications()
      .then(data => { setNotifications(data); setLoading(false); })
      .catch(() => { setError('Failed to load notifications'); setLoading(false); });
  }, []);

  const markSeen = (id) => {
    const updated = [...new Set([...seen, id])];
    setSeen(updated);
    localStorage.setItem('seen', JSON.stringify(updated));
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>All Notifications ({notifications.length})</h2>
      {notifications.map(n => (
        <div
          key={n.ID}
          className={`card ${seen.includes(n.ID) ? 'read' : 'unread'}`}
          onClick={() => markSeen(n.ID)}
        >
          <div className="card-header">
            <span className={`card-title ${seen.includes(n.ID) ? 'read' : ''}`}>
              {n.Message}
              {!seen.includes(n.ID) && <span className="chip new">New</span>}
            </span>
            <span className={`chip ${n.Type}`}>{n.Type}</span>
          </div>
          <div className="timestamp">{n.Timestamp}</div>
        </div>
      ))}
    </div>
  );
}

export default AllNotifications;