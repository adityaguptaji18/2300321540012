import { useEffect, useState } from 'react';
import { getPriorityNotifications } from '../api';

function PriorityNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(10);
  const [type, setType] = useState('');

  useEffect(() => {
    setLoading(true);
    getPriorityNotifications(limit, type)
      .then(data => { setNotifications(data); setLoading(false); })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [limit, type]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Priority Inbox</h2>
      <div className="filters">
        <label>Top:
          <input
            type="number"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            min="1" max="50"
            style={{ width: 70, marginLeft: 8 }}
          />
        </label>
        <label>Type:
          <select value={type} onChange={e => setType(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="">All</option>
            <option value="Placement">Placement</option>
            <option value="Result">Result</option>
            <option value="Event">Event</option>
          </select>
        </label>
      </div>
      {notifications.map((n, i) => (
        <div key={n.ID} className="card unread">
          <div className="card-header">
            <span className="card-title">
              <span className="rank">#{i + 1}</span>{n.Message}
            </span>
            <span className={`chip ${n.Type}`}>{n.Type}</span>
          </div>
          <div className="timestamp">{n.Timestamp}</div>
        </div>
      ))}
    </div>
  );
}

export default PriorityNotifications;