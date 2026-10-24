import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Protected from './components/Protected';
import ClerkTokenProvider from './components/ClerkTokenProvider';
import ClerkWithRouter from './components/ClerkWithRouter';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Explore from './pages/Explore';
import Inventory from './pages/Inventory';
import ImportInventory from './pages/ImportInventory';
import Feed from './pages/Feed';
import UserProfile from './pages/UserProfile';
import MyProfile from './pages/MyProfile';
import Community from './pages/Community';
import CommunityPost from './pages/CommunityPost';
import Notifications from './pages/Notifications';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) throw new Error('Missing Clerk publishable key');

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <ClerkWithRouter publishableKey={PUBLISHABLE_KEY}>
        <ClerkTokenProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="/inventory" element={<Protected><Inventory /></Protected>} />
              <Route path="/inventory/import" element={<Protected><ImportInventory /></Protected>} />
              <Route path="/feed" element={<Protected><Feed /></Protected>} />
              <Route path="/profile" element={<Protected><MyProfile /></Protected>} />
              <Route path="/users/:id" element={<UserProfile />} />
              <Route path="/u/:id" element={<UserProfile />} />
              <Route path="/community" element={<Protected><Community /></Protected>} />
              <Route path="/community/:id" element={<Protected><CommunityPost /></Protected>} />
              <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
              {/* Legacy redirects */}
              <Route path="/login" element={<Navigate to="/sign-in" replace />} />
              <Route path="/register" element={<Navigate to="/sign-up" replace />} />
            </Routes>
          </main>
        </div>
        </ClerkTokenProvider>
      </ClerkWithRouter>
    </BrowserRouter>
);
