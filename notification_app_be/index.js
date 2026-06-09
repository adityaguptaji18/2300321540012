import express from 'express';
import axios from 'axios';
import cors from 'cors';
const app = express();
app.use(express.json());
app.use(cors());

const API_URL = 'http://4.224.186.213/evaluation-service/notifications';
const AUTH_URL = 'http://4.224.186.213/evaluation-service/auth';

const clientId = '1e96ef40-02e5-4d53-91e4-b2289d7e6541';
const clientSecret = 'mraNPcSymQzBXxup';

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

const getToken = async () => {
  const { data } = await axios.post(AUTH_URL, {
    email: 'aditya.23b1541213@abes.ac.in',
    name: 'Aditya Gupta',
    rollNo: '2300321540012',
    accessCode: 'cXuqht',
    clientID: clientId,
    clientSecret: clientSecret
  });
  return data.access_token;
};

app.get('/api/priority-notifications', async (req, res) => {
  try {
    const token = await getToken();

    const { data } = await axios.get(API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
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

app.get('/api/notifications', async (req, res) => {
  try {
    const token = await getToken();

    const { data } = await axios.get(API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    res.json({ status: 200, data: data.notifications });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ status: 500, message: 'Failed to fetch notifications' });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});