// GrafanaEmbed.jsx
// Component for embedding Grafana dashboards with real-time auto-refresh

import React from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

const GrafanaEmbed = ({ 
  dashboardUrl, 
  title, 
  height = '600px',
  showHeader = true,
  refreshInterval = '10s' 
}) => {
  
  // Add query parameters for embedding
  const getEmbedUrl = (url) => {
    if (!url) return '';
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}refresh=${refreshInterval}&theme=light&kiosk=tv`;
  };

  const embedUrl = getEmbedUrl(dashboardUrl);
  const directUrl = dashboardUrl;

  if (!dashboardUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Chưa cấu hình Dashboard URL</p>
          <p className="text-sm text-gray-500 mt-1">
            Vui lòng tạo dashboard trong Grafana và cập nhật URL
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
              Auto-refresh: {refreshInterval}
            </span>
          </div>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Mở trong Grafana
          </a>
        </div>
      )}

      {/* Iframe */}
      <div className="flex-1 relative">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ 
            border: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
          title={title}
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default GrafanaEmbed;
