import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import DocumentsView from './DocumentsView';
import FoldersView from './FoldersView';
// import FolderRolesView from './FolderRolesView';
import ChatView from './ChatView';
import AnalyticsView from './AnalyticsView';
import LoginForm from './LoginForm';
import { RefreshCw } from 'lucide-react';

const App = () => {
  const [activeView, setActiveView] = useState('documents');
  const { isAuthenticated, loading, isReady, user } = useAuth();

  // Tự động chuyển về view phù hợp khi user thay đổi
  useEffect(() => {
    if (user) {
      const isManager = user.user_type === 'Cán bộ quản lý';

      // Nếu không phải quản lý và đang ở tab documents/folders, chuyển về chat
      if (!isManager && (activeView === 'documents' || activeView === 'folders' || activeView === 'folder-roles')) {
        setActiveView('chat');
      }
      // Nếu là quản lý và đang ở tab không hợp lệ, chuyển về documents
      else if (isManager && activeView !== 'documents' && activeView !== 'folders' && activeView !== 'chat' && activeView !== 'analytics') {
        setActiveView('documents');
      }
    }
  }, [user, activeView]);

  const LoadingScreen = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl shadow-lg">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-gray-700 font-medium">Đang khởi tạo...</span>
      </div>
    </div>
  ), []);

  const PreparingDataScreen = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl shadow-lg">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-gray-700 font-medium">Đang chuẩn bị dữ liệu...</span>
      </div>
    </div>
  ), []);

  // State để quản lý việc reset các component
  const [resetKeys] = useState({
    documents: 0,
    folders: 0,
    chat: 0,
    analytics: 0
  });

  console.log('App render state:', {
    loading,
    isAuthenticated,
    isReady,
    hasUser: !!user,
  });

  if (loading && !isAuthenticated) {
    console.log('Showing initial loading screen');
    return LoadingScreen;
  }

  if (isAuthenticated && !isReady) {
    console.log('Showing preparing data screen');
    return PreparingDataScreen;
  }

  if (isAuthenticated && isReady && user) {
    console.log('Showing main app');
    return (
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activeView={activeView} setActiveView={setActiveView} />
          <main className="flex-1 overflow-hidden relative">
            {/* Render tất cả views nhưng chỉ hiển thị view active */}
            <div style={{ display: activeView === 'documents' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <DocumentsView key={`documents-${resetKeys.documents}`} />
            </div>
            <div style={{ display: activeView === 'folders' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
              <FoldersView key={`folders-${resetKeys.folders}`} />
            </div>
            <div style={{ display: activeView === 'chat' ? 'block' : 'none', height: '100%' }}>
              <ChatView key={`chat-${resetKeys.chat}`} />
            </div>
            <div style={{ display: activeView === 'analytics' ? 'block' : 'none', height: '100%' }}>
              <AnalyticsView key={`analytics-${resetKeys.analytics}`} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  console.log('Showing login form');
  return <LoginForm />;
};

export default App;