import express from 'express';
import axios from 'axios';
const clientSecret = 'mraNPcSymQzBXxup';
const clientId = '1e96ef40-02e5-4d53-91e4-b2289d7e6541';

const app = express();
app.use(express.json());

const API_URL = 'http://4.224.186.213/evaluation-service/notifications';

const WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1
};

const getScore = (notification) => {
  const weight = WEIGHTS[notification.Type] || 0;
  const recency = new Date(notification.Timestamp).getTime();
  return weight * 1e13 + recency;
};

app.get('/api/priority-notifications', async (req, res) => {
  try {
    const { data } = await axios.get(API_URL, {
      headers: {
        'authorization': `Bearer ${clientSecret}`,
        'clientId': clientId,
        'clientSecret': clientSecret
      }
    });

    const notifications = data.notifications;

    const top10 = notifications
      .sort((a, b) => getScore(b) - getScore(a))
      .slice(0, 10);

    res.json({ status: 200, data: top10 });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ status: 500, message: 'Failed to fetch notifications' });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});