import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { MessageCircle, Send, Bot, RefreshCw, Trash2, History, Zap } from 'lucide-react';
import { apiRequest, safeJsonParse, API_CONFIG } from './api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Danh sách fileTypes mặc định nếu API thất bại
const DEFAULT_FILE_TYPES = ['admin', 'teacher', 'student', 'public'];

// Generate unique session ID
const generateSessionId = (userId) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `usr:${userId}:sess:${timestamp}:${random}`;
};

const ChatView = () => {
    const { token, isReady, refreshToken, user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFileType, setSelectedFileType] = useState('public');
    const [fileTypes, setFileTypes] = useState(DEFAULT_FILE_TYPES);
    const [error, setError] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [disableQueryRewrite, setDisableQueryRewrite] = useState(false);
    const messagesEndRef = useRef(null);

    // Tự động scroll xuống cuối khi có tin nhắn mới
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Tạo session ID mới khi component mount hoặc khi user thay đổi
    useEffect(() => {
        if (isReady && user) {
            const newSessionId = generateSessionId(user.id || 'anonymous');
            setSessionId(newSessionId);
            console.log('✅ Created new session:', newSessionId);
        }
    }, [isReady, user]);

    // Token validation helper
    const validateToken = useCallback(async () => {
        if (!isReady || !token) {
            setError('Vui lòng đăng nhập lại để tiếp tục');
            return false;
        }

        if (token && (typeof token.isExpiringSoon === 'function' && token.isExpiringSoon())) {
            try {
                await refreshToken();
                return true;
            } catch (error) {
                setError('Không thể làm mới token, vui lòng đăng nhập lại');
                return false;
            }
        }

        return true;
    }, [isReady, token, refreshToken]);

    // Fetch file types từ API
    const fetchFileTypes = useCallback(async () => {
        if (!isReady) return;
        const isValid = await validateToken();
        if (!isValid) return;

        try {
            const response = await apiRequest(API_CONFIG.ENDPOINTS.DOCUMENTS_TYPES, {}, true, false, token);
            if (response.ok) {
                const data = await safeJsonParse(response);
                if (data?.folders?.length > 0) {
                    setFileTypes(data.folders);
                    setSelectedFileType(prev => !prev || !data.folders.includes(prev) ? data.folders[0] : prev);
                    setError('');
                } else {
                    setFileTypes(DEFAULT_FILE_TYPES);
                    setSelectedFileType(prev => !prev || !DEFAULT_FILE_TYPES.includes(prev) ? DEFAULT_FILE_TYPES[0] : prev);
                }
            } else {
                setFileTypes(DEFAULT_FILE_TYPES);
                setSelectedFileType(prev => !prev || !DEFAULT_FILE_TYPES.includes(prev) ? DEFAULT_FILE_TYPES[0] : prev);
            }
        } catch (error) {
            setFileTypes(DEFAULT_FILE_TYPES);
            setSelectedFileType(prev => !prev || !DEFAULT_FILE_TYPES.includes(prev) ? DEFAULT_FILE_TYPES[0] : prev);
            console.error('Error fetching file types:', error);
        }
    }, [isReady, validateToken, token]);

    useEffect(() => {
        if (isReady) {
            fetchFileTypes();
        }
    }, [isReady, fetchFileTypes]);

    // Reset conversation - tạo session mới
    const handleResetConversation = () => {
        if (window.confirm('Bạn có chắc muốn bắt đầu cuộc hội thoại mới? Lịch sử hiện tại sẽ bị xóa.')) {
            setMessages([]);
            setInputMessage('');
            setError('');
            const newSessionId = generateSessionId(user?.id || 'anonymous');
            setSessionId(newSessionId);
            console.log('🔄 Reset conversation, new session:', newSessionId);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading || !sessionId) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        const currentQuery = inputMessage;
        setInputMessage('');
        setIsLoading(true);
        setError('');

        try {
            const isValid = await validateToken();
            if (!isValid) {
                throw new Error('Phiên đăng nhập không hợp lệ');
            }

            const requestBody = {
                query: currentQuery,
                file_type: selectedFileType,
                k: 5,
                similarity_threshold: 0.4,
                session_id: sessionId,
                disable_query_rewrite: disableQueryRewrite
            };

            console.log('📤 Sending request:', {
                session_id: sessionId,
                query: currentQuery,
                disable_query_rewrite: disableQueryRewrite
            });

            // Gọi endpoint search-with-llm-context
            const response = await apiRequest(
                API_CONFIG.ENDPOINTS.SEARCH_WITH_LLM_CONTEXT,
                {
                    method: 'POST',
                    body: JSON.stringify(requestBody)
                },
                true,
                false,
                token
            );

            if (response.ok) {
                const data = await safeJsonParse(response);

                console.log('📥 Response received:', {
                    session_id: data.session_id,
                    query_rewritten: data.query_rewritten,
                    history_used: data.history_used,
                    history_count: data.history_count
                });

                // Hiển thị thông tin query rewriting nếu có
                if (data.query_rewritten) {
                    console.log('🔄 Query Rewriting:');
                    console.log('   Original:', data.original_query);
                    console.log('   Rewritten:', data.rewritten_query);
                }

                const aiMessage = {
                    id: Date.now() + 1,
                    type: 'ai',
                    content: data.llm_response,
                    contexts: data.contexts,
                    timestamp: new Date(),
                    metadata: {
                        session_id: data.session_id,
                        query_rewritten: data.query_rewritten,
                        original_query: data.original_query,
                        rewritten_query: data.rewritten_query,
                        history_used: data.history_used,
                        history_count: data.history_count
                    }
                };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                const errorData = await safeJsonParse(response);
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            const errorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: `❌ Xin lỗi, đã có lỗi xảy ra: ${error.message}. Vui lòng thử lại sau.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                            Trò chuyện với AI
                        </h3>
                        <select
                            value={selectedFileType}
                            onChange={(e) => setSelectedFileType(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            {fileTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Query Rewriting Toggle */}
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
                            <input
                                type="checkbox"
                                checked={!disableQueryRewrite}
                                onChange={(e) => setDisableQueryRewrite(!e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Zap className="w-4 h-4" />
                            <span className="font-medium">Query Rewriting</span>
                        </label>

                        {/* Reset Button */}
                        <button
                            onClick={handleResetConversation}
                            className="px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-medium"
                            title="Bắt đầu cuộc hội thoại mới"
                        >
                            <Trash2 className="w-4 h-4" />
                            Làm mới
                        </button>
                    </div>
                </div>

                {/* Session Info & Status */}
                <div className="mt-2 flex items-center justify-between">
                    {sessionId && (
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                            <History className="w-3 h-3" />
                            <span className="font-mono">{sessionId.substring(0, 40)}...</span>
                        </div>
                    )}
                    {!disableQueryRewrite && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Query Rewriting bật
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <Bot className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">
                            Bắt đầu cuộc trò chuyện
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Hỏi tôi bất cứ điều gì về tài liệu trong hệ thống
                        </p>
                        <div className="space-y-2 text-sm text-gray-500">
                            <div className="flex items-center justify-center gap-2">
                                <History className="w-4 h-4 text-blue-500" />
                                <span>AI sẽ nhớ ngữ cảnh câu hỏi trước đó</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <Zap className="w-4 h-4 text-green-500" />
                                <span>Query Rewriting giúp hiểu câu hỏi theo ngữ cảnh</span>
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-3xl px-4 py-3 rounded-lg ${message.type === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-200 shadow-sm'
                                }`}
                        >
                            {/* Message Content */}
                            <div className={`prose prose-sm max-w-none ${message.type === 'user' ? 'prose-invert' : ''}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                </ReactMarkdown>
                            </div>

                            {/* AI Metadata - Query Rewriting Info */}
                            {message.type === 'ai' && message.metadata && message.metadata.query_rewritten && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="bg-blue-50 px-3 py-2 rounded-lg">
                                        <div className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            Query Rewriting
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div>
                                                <span className="font-semibold text-gray-700">Câu gốc:</span>
                                                <div className="text-gray-600 italic ml-2">"{message.metadata.original_query}"</div>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-700">Viết lại:</span>
                                                <div className="text-blue-700 font-medium ml-2">"{message.metadata.rewritten_query}"</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* History Usage Info */}
                            {/* {message.type === 'ai' && message.metadata && message.metadata.history_used && (
                                <div className="mt-2">
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <History className="w-3 h-3" />
                                        Đã sử dụng {message.metadata.history_count} tin nhắn lịch sử
                                    </div>
                                </div>
                            )} */}

                            {/* Context Sources */}
                            {message.contexts && message.contexts.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 mb-2 font-semibold">📖 Nguồn tham khảo:</p>
                                    <div className="space-y-2">
                                        {message.contexts.slice(0, 3).map((context, index) => (
                                            <div key={index} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-semibold text-gray-700 text-xs">
                                                        {context.metadata.filename}
                                                    </p>
                                                    <span className="text-green-600 font-medium text-xs">
                                                        {(context.metadata.similarity_score * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 line-clamp-2">{context.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timestamp */}
                            <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                                {message.timestamp.toLocaleTimeString('vi-VN')}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-lg">
                            <div className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                <span className="text-gray-600">AI đang phân tích...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4 shadow-lg">
                <div className="flex gap-3">
                    <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập câu hỏi của bạn... (Enter để gửi, Shift+Enter để xuống dòng)"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="2"
                        disabled={isLoading || !sessionId}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading || !sessionId}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                    >
                        <Send className="w-5 h-5" />
                        {isLoading ? 'Đang gửi...' : 'Gửi'}
                    </button>
                </div>
                {!sessionId && (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Đang khởi tạo phiên làm việc...
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatView;