import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import ProgressDashboard from './components/ProgressDashboard';
import DocumentUpload from './components/DocumentUpload';
import Quiz from './components/Quiz';

/**
 * Main App Component with Sidebar Navigation
 * Professional Dashboard Layout
 */
const App = () => {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [currentGraph, setCurrentGraph] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', storedUserId);
    }
    setUserId(storedUserId);

    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const handleAuthSubmit = (authData) => {
    setUserId(authData.userId);
    setUserName(authData.name);
    localStorage.setItem('userId', authData.userId);
    localStorage.setItem('userName', authData.name);
    localStorage.setItem('userEmail', authData.email);
    setActiveView('dashboard');
  };

  if (!userName) {
    return <Auth onAuthSubmit={handleAuthSubmit} />;
  }

  const handleGraphCreated = (graph) => {
    setCurrentGraph(graph);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', count: null },
    { id: 'upload', label: 'Upload', icon: '📤', count: null },
    { id: 'quiz', label: 'Quiz', icon: '✏️', count: null },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`}>
        <div className="sidebar-header">
          <div className="text-2xl font-bold text-green-600">🧠</div>
          {sidebarOpen && <div className="sidebar-logo">Concept AI</div>}
        </div>

        <nav className="sidebar-menu">
          <div className="sidebar-section">
            <div className="sidebar-section-title">MENU</div>
            {menuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.count && (
                      <span className="sidebar-badge">{item.count}</span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="sidebar-section mt-8">
            <div className="sidebar-section-title">GENERAL</div>
            <div className="sidebar-item">
              <span className="text-xl">⚙️</span>
              {sidebarOpen && <span className="flex-1">Settings</span>}
            </div>
            <div className="sidebar-item">
              <span className="text-xl">❓</span>
              {sidebarOpen && <span className="flex-1">Help</span>}
            </div>
            <div
              onClick={() => {
                localStorage.removeItem('userName');
                setUserName('');
              }}
              className="sidebar-item hover:text-red-600"
            >
              <span className="text-xl">🚪</span>
              {sidebarOpen && <span className="flex-1">Logout</span>}
            </div>
          </div>
        </nav>

        {/* Mobile App Promo */}
        {sidebarOpen && (
          <div className="p-6">
            <div className="bg-green-600 text-white rounded-xl p-4 text-center">
              <p className="text-sm font-semibold mb-2">Download our Mobile App</p>
              <p className="text-xs mb-3">Get learning on the go!</p>
              <button className="bg-white text-green-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100">
                Download
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="main-layout flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="top-nav">
          <div className="top-nav-left">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              {sidebarOpen ? '☰' : '→'}
            </button>
            <input
              type="text"
              placeholder="Search task"
              className="search-box ml-4"
            />
          </div>

          <div className="top-nav-right">
            <button className="notification-icon">
              📬
            </button>
            <button className="notification-icon">
              🔔
            </button>
            <div className="flex items-center gap-3">
              <div className="user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{userName}</div>
                <div className="user-email">{localStorage.getItem('userEmail')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="content flex-1 overflow-auto">
          {activeView === 'dashboard' && (
            <ProgressDashboard userId={userId} userName={userName} currentGraph={currentGraph} />
          )}

          {activeView === 'upload' && userId && (
            <div>
              <div className="content-header">
                <div className="content-title">
                  <h1>📤 Upload Document</h1>
                  <p className="content-subtitle">Upload and extract concepts from your learning materials</p>
                </div>
              </div>
              <DocumentUpload userId={userId} onGraphCreated={handleGraphCreated} />
            </div>
          )}

          {activeView === 'quiz' && userId && (
            <div>
              <div className="content-header">
                <div className="content-title">
                  <h1>✏️ Take Quiz</h1>
                  <p className="content-subtitle">Test your knowledge with AI-generated questions</p>
                </div>
              </div>
              <Quiz userId={userId} graphId={currentGraph?.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
