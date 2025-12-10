// AnalyticsView.jsx
// Modern Dashboard with Real-time Analytics

import React, { useState, useEffect } from 'react';
import {
    BarChart3, Users, Activity, Wifi, WifiOff,
    TrendingUp, Target, Zap, MessageSquare
} from 'lucide-react';
import useWebSocket from './hooks/useWebSocket';
import RealtimeChart from './components/RealtimeChart';

const AnalyticsView = () => {
    const [analyticsData, setAnalyticsData] = useState({
        departments: [],      // For pie chart by department_name
        popularByYear: {},    // For heatmap: {year: [{query_text, total_count}, ...]}
        popularQuestions: [], // For table
        overall: {            // For dashboard cards
            total_queries: 0,
            success_count: 0,
            success_rate: 0,
            avg_response_time: 0
        }
    });

    const [loading, setLoading] = useState(true);

    // WebSocket connection
    const WS_URL = 'ws://localhost:8000/ws/analytics';
    const { isConnected, lastMessage, error } = useWebSocket(WS_URL);

    // Fetch analytics data from API
    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const API_BASE = 'http://localhost:8000/analytics/redis';

                const [
                    departmentRes,
                    popularByYearRes,
                    popularRes,
                    overallRes
                ] = await Promise.all([
                    fetch(`${API_BASE}/department?days=30`).then(r => r.json()),
                    fetch(`${API_BASE}/popular-by-year?days=30&limit=5`).then(r => r.json()),
                    fetch(`${API_BASE}/popular-questions?days=30&limit=10`).then(r => r.json()),
                    fetch(`${API_BASE}/overall-summary?days=30`).then(r => r.json())
                ]);

                console.log('📊 API Responses:', {
                    department: departmentRes,
                    popularByYear: popularByYearRes,
                    popularQuestions: popularRes,
                    overall: overallRes
                });

                setAnalyticsData({
                    departments: departmentRes.data || [],
                    popularByYear: popularByYearRes.data || {},
                    popularQuestions: popularRes.data || [],
                    overall: overallRes || { total_queries: 0, success_count: 0, success_rate: 0, avg_response_time: 0 }
                });

                setLoading(false);
            } catch (err) {
                console.error('❌ Error fetching analytics:', err);
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    // Handle WebSocket messages
    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.type === 'initial') {
                console.log('📡 WebSocket initial data:', lastMessage.data);
                setAnalyticsData(lastMessage.data);
                setLoading(false);
            } else if (lastMessage.type === 'update') {
                console.log('📡 WebSocket update:', lastMessage.data);
                setAnalyticsData(prev => ({
                    ...prev,
                    ...lastMessage.data
                }));
            }
        }
    }, [lastMessage]);

    // Calculate summary statistics from overall endpoint
    const stats = {
        totalQueries: analyticsData.overall?.total_queries || 0,
        successCount: analyticsData.overall?.success_count || 0,
        successRate: analyticsData.overall?.success_rate || 0,
        avgResponseTime: Math.round(analyticsData.overall?.avg_response_time || 0)
    };

    // Stat Card Component
    const StatCard = ({ icon: Icon, label, value, suffix = '', color = 'blue', trend }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className={`text-3xl font-bold text-${color}-600`}>
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </h3>
                        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
                    </div>
                    {trend && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`p-3 bg-${color}-50 rounded-lg`}>
                    <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
            </div>
        </div>
    );



    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-purple-50">
            {/* Dashboard Content */}
            <div className="flex-1 overflow-auto p-6">
                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">Bảng phân tích</h2>
                            <p className="text-purple-100 text-sm">Phân tích truy vấn theo thời gian thực</p>
                        </div>

                        {/* Connection Status */}
                        {/* <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isConnected ? 'bg-white text-green-600' : 'bg-white/20 text-white'
                            }`}>
                            {isConnected ? (
                                <>
                                    <Wifi className="w-4 h-4" />
                                    <span className="text-sm font-medium">Live</span>
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-4 h-4" />
                                    <span className="text-sm font-medium">Connecting...</span>
                                </>
                            )}
                        </div> */}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium">Đang tải dữ liệu...</p>
                        </div>
                    </div>
                ) : (
                <div className="space-y-6">
                    {/* Summary Statistics Cards - 3 col */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            icon={MessageSquare}
                            label="Tổng số truy vấn"
                            value={stats.totalQueries}
                            color="blue"
                        />
                        <StatCard
                            icon={Target}
                            label="Số câu thành công"
                            value={stats.successCount}
                            suffix={`(${stats.successRate.toFixed(1)}%)`}
                            color="green"
                        />
                        <StatCard
                            icon={Zap}
                            label="Thời gian trung bình"
                            value={stats.avgResponseTime}
                            suffix="ms"
                            color="purple"
                        />
                    </div>

                    {/* Grid: Popular Questions + Department Pie (50-50) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Popular Questions Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-pink-600" />
                                Câu hỏi phổ biến nhất
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">Top 10 câu hỏi được hỏi nhiều nhất</p>

                            {analyticsData.popularQuestions?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3 text-left">#</th>
                                                <th className="px-4 py-3 text-left">Câu hỏi</th>
                                                <th className="px-4 py-3 text-center">Số lần</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {analyticsData.popularQuestions.slice(0, 10).map((q, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs ${idx < 3 ? 'bg-gradient-to-br from-pink-500 to-purple-500' : 'bg-gray-400'
                                                            }`}>
                                                            {idx + 1}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-gray-700 line-clamp-2 text-sm">{q.query_text}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-xs">
                                                            {q.total_count}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <div className="text-5xl mb-3">❓</div>
                                    <p className="font-medium">Chưa có dữ liệu câu hỏi</p>
                                    <p className="text-sm mt-1">Dữ liệu sẽ xuất hiện sau khi có queries từ người dùng</p>
                                </div>
                            )}
                        </div>

                        {/* Department Pie Chart */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" style={{ minHeight: '400px' }}>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-purple-600" />
                                Thống kê theo Khoa
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">Phân bố câu hỏi theo từng khoa</p>
                            <RealtimeChart
                                data={analyticsData.departments}
                                type="pie"
                                xAxisKey="department_name"
                                dataKey="query_count"
                            />
                        </div>
                    </div>

                    {/* Heatmap Full Width */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Câu hỏi phổ biến theo năm sinh viên
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Sinh viên từng năm hỏi nhiều về chủ đề gì</p>
                        <RealtimeChart
                            data={analyticsData.popularByYear}
                            type="heatmap"
                        />
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsView;
