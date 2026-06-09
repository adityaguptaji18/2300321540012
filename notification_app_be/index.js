import express from 'express';
import axios from 'axios';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const logFile = path.join(__dirname, 'app.log');
const logger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${Date.now() - start}ms`,
      body: req.body
    };
    const logLine = JSON.stringify(log) + '\n';
    console.log(logLine);
    fs.appendFile(logFile, logLine, (err) => {
      if (err) console.error('Log error:', err);
    });
  });
  next();
};
app.use(logger);

const API_URL = 'http://4.224.186.213/evaluation-service/notifications';
const AUTH_URL = 'http://4.224.186.213/evaluation-service/auth';
const clientId = '1e96ef40-02e5-4d53-91e4-b2289d7e6541';
const clientSecret = 'mraNPcSymQzBXxup';

const WEIGHTS = { Placement: 3, Result: 2, Event: 1 };

const getScore = (n) => {
  const weight = WEIGHTS[n.Type] || 0;
  const recency = new Date(n.Timestamp).getTime();
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

app.get('/api/notifications', async (req, res) => {
  try {
    const token = await getToken();
    const { data } = await axios.get(API_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.json({ status: 200, data: data.notifications });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ status: 500, message: 'Failed to fetch notifications' });
  }
});

app.get('/api/priority-notifications', async (req, res) => {
  try {
    const token = await getToken();
    const { data } = await axios.get(API_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let notifications = data.notifications;
    const { limit = 10, notification_type } = req.query;

    if (notification_type) {
      notifications = notifications.filter(n => n.Type === notification_type);
    }

    const topN = notifications
      .sort((a, b) => getScore(b) - getScore(a))
      .slice(0, parseInt(limit));

    res.json({ status: 200, data: topN });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ status: 500, message: 'Failed to fetch notifications' });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});