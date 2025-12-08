// AnalyticsView.jsx
// Main analytics view with MongoDB Charts integration

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Calendar, Database, RefreshCw } from 'lucide-react';
import MongoChartsEmbed from './MongoChartsEmbed';
import axios from 'axios';

const AnalyticsView = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [chartsInfo, setChartsInfo] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchChartsInfo();
    fetchHealth();
  }, []);

  const fetchChartsInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/charts/embed-info`);
      setChartsInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch charts info:', error);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/health`);
      setHealth(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch health:', error);
      setLoading(false);
    }
  };

  // Dashboard/Chart configurations
  const CHARTS_CONFIG = {
    overview: {
      title: 'Tổng quan Hệ thống',
      icon: BarChart3,
      description: 'Dashboard tổng hợp tất cả metrics',
      embedKey: 'overview_dashboard'
    },
    faculty: {
      title: 'Phân tích theo Faculty',
      icon: Users,
      description: 'Thống kê queries theo khoa/phòng ban',
      embedKey: 'faculty_chart'
    },
    year: {
      title: 'Xu hướng theo Năm',
      icon: Calendar,
      description: 'Phân tích queries theo năm học',
      embedKey: 'year_chart'
    },
    heatmap: {
      title: 'Heatmap Sử dụng',
      icon: Database,
      description: 'Phân bố thời gian sử dụng',
      embedKey: 'heatmap_chart'
    }
  };

  const tabs = Object.entries(CHARTS_CONFIG);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-700">Đang tải analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Phân tích & Thống kê</h1>
              <p className="text-sm text-gray-500">Real-time analytics với Metabase</p>
            </div>
          </div>

          {/* Health Status */}
          {health && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-700">
                {health.status === 'healthy' ? 'MongoDB Connected' : 'MongoDB Disconnected'}
              </span>
              {health.collection_stats && (
                <span className="text-xs text-gray-500 ml-2">
                  ({Object.values(health.collection_stats).reduce((a, b) => a + b, 0)} records)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map(([key, config]) => {
            const Icon = config.icon;
            const isActive = activeTab === key;

            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-purple-100 text-purple-700 font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                <span>{config.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Content */}
      <div className="flex-1 overflow-hidden p-4">
        {tabs.map(([key, config]) => (
          <div
            key={key}
            className="h-full"
            style={{ display: activeTab === key ? 'block' : 'none' }}
          >
            {chartsInfo?.embed_urls ? (
              <MongoChartsEmbed
                embedUrl={chartsInfo.embed_urls[config.embedKey]}
                title={config.title}
                height="100%"
                autoRefresh={true}
                refreshInterval={240} // 4 minutes
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">Đang tải cấu hình charts...</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-xs">
          <p className="text-gray-500">
            💡 Charts tự động làm mới mỗi 4 phút. Data real-time từ Spark Streaming.
          </p>
          {chartsInfo?.charts_base_url && (
            <a
              href={chartsInfo.charts_base_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <Database className="w-3 h-3" />
              Mở Metabase
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
