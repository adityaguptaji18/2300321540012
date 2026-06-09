import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AllNotifications from './pages/AllNotifications';
import PriorityNotifications from './pages/PriorityNotifications';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <h1>Campus Notifications</h1>
        <div>
          <Link to="/">All Notifications</Link>
          <Link to="/priority">Priority Inbox</Link>
        </div>
      </nav>
      <div className="container">
        <Routes>
          <Route path="/" element={<AllNotifications />} />
          <Route path="/priority" element={<PriorityNotifications />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;