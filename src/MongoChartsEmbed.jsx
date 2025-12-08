// MongoChartsEmbed.jsx
// Component to embed MongoDB Charts dashboards/charts using iframe

import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

const MongoChartsEmbed = ({ 
  embedUrl, 
  title = "MongoDB Chart",
  height = "600px",
  autoRefresh = true,
  refreshInterval = 60 // seconds
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [embedUrl]);

  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      // Force iframe reload by changing key
      setKey(prev => prev + 1);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError("Không thể tải chart. Kiểm tra MongoDB Charts đang chạy.");
  };

  const handleManualRefresh = () => {
    setKey(prev => prev + 1);
    setIsLoading(true);
  };

  const openInNewTab = () => {
    window.open(embedUrl, '_blank');
  };

  // Check if embed URL is placeholder
  const isPlaceholder = embedUrl.includes('YOUR_') || embedUrl.includes('_ID_HERE');

  if (isPlaceholder) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-8">
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-blue-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Cần cấu hình Metabase
              </h3>
              <p className="text-gray-600 mb-4">
                Chart <strong>{title}</strong> chưa được cấu hình. Làm theo các bước sau:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
                <li>Truy cập <a href="http://localhost:8090" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Metabase UI</a></li>
                <li>Hoàn thành wizard setup (tạo admin account)</li>
                <li>Thêm database MongoDB: <code className="bg-gray-100 px-2 py-1 rounded text-sm">host.docker.internal:27017</code></li>
                <li>Chọn database: <code className="bg-gray-100 px-2 py-1 rounded text-sm">faiss_db</code></li>
                <li>Tạo questions (charts) từ analytics collections</li>
                <li>Tạo dashboard và enable public sharing</li>
                <li>Copy public URLs và update trong backend</li>
              </ol>
              <a 
                href="http://localhost:8090" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Mở Metabase
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {autoRefresh && (
            <span className="text-xs text-gray-500">
              (Auto-refresh mỗi {refreshInterval}s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh chart"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openInNewTab}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Mở trong tab mới"
          >
            <ExternalLink className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Chart iframe */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-gray-700">Đang tải chart...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-6 h-6" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <iframe
          key={key}
          src={embedUrl}
          className="w-full h-full border-0"
          style={{ height }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
};

export default MongoChartsEmbed;
