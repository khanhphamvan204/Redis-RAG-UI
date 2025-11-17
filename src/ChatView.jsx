import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { MessageCircle, Send, Bot, RefreshCw } from 'lucide-react';
import { apiRequest, safeJsonParse, API_CONFIG } from './api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Danh sách fileTypes mặc định nếu API thất bại
const DEFAULT_FILE_TYPES = ['admin', 'teacher', 'student', 'public'];

const ChatView = () => {
    const { token, isReady, refreshToken } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFileType, setSelectedFileType] = useState('public');
    const [fileTypes, setFileTypes] = useState(DEFAULT_FILE_TYPES);
    const [error, setError] = useState('');

    // Hàm reset chat
    const handleResetChat = () => {
        setMessages([]);
        setInputMessage('');
        setError('');
    };

    // Token validation helper
    const validateToken = useCallback(async () => {
        if (!isReady || !token) {
            setError('Vui lòng đăng nhập lại để tiếp tục');
            return false;
        }

        // Kiểm tra xem token có sắp hết hạn không và làm mới nếu cần
        if (token && (typeof token.isExpiringSoon === 'function' && token.isExpiringSoon())) {
            try {
                await refreshToken();
                return true;
            } catch {
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
                    // Chỉ set selectedFileType nếu chưa được set hoặc không hợp lệ
                    setSelectedFileType(prev => !prev || !data.folders.includes(prev) ? data.folders[0] : prev);
                    setError('');
                } else {
                    setFileTypes(DEFAULT_FILE_TYPES);
                    setSelectedFileType(prev => !prev || !DEFAULT_FILE_TYPES.includes(prev) ? DEFAULT_FILE_TYPES[0] : prev);
                    setError('Dữ liệu loại tài liệu trống, sử dụng danh sách mặc định');
                }
            } else {
                setFileTypes(DEFAULT_FILE_TYPES);
                setSelectedFileType(prev => !prev || !DEFAULT_FILE_TYPES.includes(prev) ? DEFAULT_FILE_TYPES[0] : prev);
                setError('Không thể tải danh sách loại tài liệu, sử dụng danh sách mặc định');
            }
        } catch (error) {
            setFileTypes(DEFAULT_FILE_TYPES);
            setSelectedFileType(prev => !prev || !DEFAULT_FILE_TYPES.includes(prev) ? DEFAULT_FILE_TYPES[0] : prev);
            setError('Lỗi khi tải danh sách loại tài liệu: ' + error.message);
        }
    }, [isReady, validateToken, token]);

    // Gọi fetchFileTypes khi component được mount
    useEffect(() => {
        if (isReady) {
            fetchFileTypes();
        }
    }, [isReady, fetchFileTypes]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = { id: Date.now(), type: 'user', content: inputMessage, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const isValid = await validateToken();
            if (!isValid) {
                throw new Error('Phiên đăng nhập không hợp lệ');
            }

            const response = await apiRequest(API_CONFIG.ENDPOINTS.SEARCH_WITH_LLM, {
                method: 'POST',
                body: JSON.stringify({
                    query: inputMessage,
                    file_type: selectedFileType,
                    k: 5,
                    similarity_threshold: 0.4
                })
            }, false, false, token);

            if (response.ok) {
                const data = await safeJsonParse(response);
                const aiMessage = {
                    id: Date.now() + 1,
                    type: 'ai',
                    content: data.llm_response,
                    contexts: data.contexts,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: `Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn: ${error.message}. Vui lòng thử lại sau.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
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
        <div className="flex flex-col h-full">
            <div className="border-b border-gray-200 p-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">Trò chuyện với AI</h3>
                    <select
                        value={selectedFileType}
                        onChange={(e) => setSelectedFileType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {fileTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleResetChat}
                        className="ml-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                        title="Làm mới cuộc trò chuyện"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="text-sm font-medium">Làm mới</span>
                    </button>
                </div>
                {error && (
                    <div className="mt-2 text-red-600 text-sm">{error}</div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Bắt đầu cuộc trò chuyện</h3>
                        <p className="text-gray-600">Hỏi tôi bất cứ điều gì về tài liệu trong hệ thống</p>
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
                            {/* Render Markdown cho content với prose styling */}
                            <div className={`prose prose-sm max-w-none ${message.type === 'user' ? 'prose-invert' : ''}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                </ReactMarkdown>
                            </div>

                            {message.contexts && message.contexts.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-500 mb-2">Nguồn tham khảo:</p>
                                    <div className="space-y-2">
                                        {message.contexts.slice(0, 2).map((context, index) => (
                                            <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                                                <p className="text-gray-700 line-clamp-3">{context.content}</p>
                                                <p className="text-gray-500 mt-1">
                                                    Độ tương đồng: {(context.metadata.similarity_score * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="text-xs opacity-70 mt-2">
                                {message.timestamp.toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-lg">
                            <div className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="text-gray-600">AI đang suy nghĩ...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-gray-200 p-4">
                <div className="flex gap-3">
                    <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập câu hỏi của bạn..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="2"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;




// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { useAuth } from './AuthContext';
// import { MessageCircle, Send, Bot, RefreshCw, Trash2, History } from 'lucide-react';
// import { apiRequest, safeJsonParse, API_CONFIG } from './api';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';

// // Danh sách fileTypes mặc định nếu API thất bại
// const DEFAULT_FILE_TYPES = ['admin', 'teacher', 'student', 'public'];

// // Generate unique session ID
// const generateSessionId = (userId) => {
//     const timestamp = Date.now();
//     const random = Math.random().toString(36).substring(2, 9);
//     return `session_${userId}_${timestamp}_${random}`;
// };

// const ChatView = () => {
//     const { token, isReady, refreshToken, user } = useAuth();
//     const [messages, setMessages] = useState([]);
//     const [inputMessage, setInputMessage] = useState('');
//     const [isLoading, setIsLoading] = useState(false);
//     const [selectedFileType, setSelectedFileType] = useState('public');
//     const [fileTypes, setFileTypes] = useState(DEFAULT_FILE_TYPES);
//     const [error, setError] = useState('');
//     const [sessionId, setSessionId] = useState(null);
//     const [queryRewriting, setQueryRewriting] = useState(true);
//     const messagesEndRef = useRef(null);

//     // Tự động scroll xuống cuối khi có tin nhắn mới
//     const scrollToBottom = () => {
//         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//     };

//     useEffect(() => {
//         scrollToBottom();
//     }, [messages]);

//     // Tạo session ID mới khi component mount hoặc khi user thay đổi
//     useEffect(() => {
//         if (isReady && user) {
//             const newSessionId = generateSessionId(user.id || 'anonymous');
//             setSessionId(newSessionId);
//             console.log('Created new session:', newSessionId);
//         }
//     }, [isReady, user]);

//     // Token validation helper
//     const validateToken = useCallback(async () => {
//         if (!isReady || !token) {
//             setError('Vui lòng đăng nhập lại để tiếp tục');
//             return false;
//         }

//         // Kiểm tra xem token có sắp hết hạn không và làm mới nếu cần
//         if (token && (typeof token.isExpiringSoon === 'function' && token.isExpiringSoon())) {
//             try {
//                 await refreshToken();
//                 return true;
//             } catch (error) {
//                 setError('Không thể làm mới token, vui lòng đăng nhập lại');
//                 return false;
//             }
//         }

//         return true;
//     }, [isReady, token, refreshToken]);

//     // Fetch file types từ API
//     const fetchFileTypes = useCallback(async () => {
//         if (!isReady) return;
//         const isValid = await validateToken();
//         if (!isValid) return;

//         try {
//             const response = await apiRequest(API_CONFIG.ENDPOINTS.DOCUMENTS_TYPES, {}, true, false, token);
//             if (response.ok) {
//                 const data = await safeJsonParse(response);
//                 if (data?.folders?.length > 0) {
//                     setFileTypes(data.folders);
//                     setSelectedFileType(prev => !prev || !data.folders.includes(prev) ? data.folders[0] : prev);
//                     setError('');
//                 } else {
//                     setFileTypes(DEFAULT_FILE_TYPES);
//                     setSelectedFileType(prev => !prev || !DEFAULT_FILE_TYPES.includes(prev) ? DEFAULT_FILE_TYPES[0] : prev);
//                     setError('Dữ liệu loại tài liệu trống, sử dụng danh sách mặc định');
//                 }
//             } else {
//                 setFileTypes(DEFAULT_FILE_TYPES);
//                 setSelectedFileType(prev => !prev || !DEFAULT_FILE_TYPES.includes(prev) ? DEFAULT_FILE_TYPES[0] : prev);
//                 setError('Không thể tải danh sách loại tài liệu, sử dụng danh sách mặc định');
//             }
//         } catch (error) {
//             setFileTypes(DEFAULT_FILE_TYPES);
//             setSelectedFileType(prev => !prev || !DEFAULT_FILE_TYPES.includes(prev) ? DEFAULT_FILE_TYPES[0] : prev);
//             setError('Lỗi khi tải danh sách loại tài liệu: ' + error.message);
//         }
//     }, [isReady, validateToken, token]);

//     // Gọi fetchFileTypes khi component được mount
//     useEffect(() => {
//         if (isReady) {
//             fetchFileTypes();
//         }
//     }, [isReady, fetchFileTypes]);

//     // Reset conversation - tạo session mới
//     const handleResetConversation = () => {
//         if (window.confirm('Bạn có chắc muốn bắt đầu cuộc hội thoại mới? Lịch sử hiện tại sẽ bị xóa.')) {
//             setMessages([]);
//             const newSessionId = generateSessionId(user?.id || 'anonymous');
//             setSessionId(newSessionId);
//             console.log('Reset conversation, new session:', newSessionId);
//         }
//     };

//     const handleSendMessage = async () => {
//         if (!inputMessage.trim() || isLoading || !sessionId) return;

//         const userMessage = {
//             id: Date.now(),
//             type: 'user',
//             content: inputMessage,
//             timestamp: new Date()
//         };
//         setMessages(prev => [...prev, userMessage]);
//         setInputMessage('');
//         setIsLoading(true);
//         setError('');

//         try {
//             const isValid = await validateToken();
//             if (!isValid) {
//                 throw new Error('Phiên đăng nhập không hợp lệ');
//             }

//             const requestBody = {
//                 query: inputMessage,
//                 file_type: selectedFileType,
//                 k: 5,
//                 similarity_threshold: 0.4,
//                 session_id: sessionId,
//                 use_query_rewriting: queryRewriting,
//                 max_history_messages: 5
//             };

//             console.log('Sending request with session:', sessionId);

//             const response = await apiRequest(API_CONFIG.ENDPOINTS.SEARCH_WITH_LLM_V2 || '/documents/vector/search-with-llm-v2', {
//                 method: 'POST',
//                 body: JSON.stringify(requestBody)
//             }, false, false, token);

//             if (response.ok) {
//                 const data = await safeJsonParse(response);

//                 console.log('Response data:', {
//                     session_id: data.session_id,
//                     original_query: data.original_query,
//                     rewritten_query: data.rewritten_query,
//                     query_rewriting_used: data.query_rewriting_used,
//                     history_used: data.history_used
//                 });

//                 const aiMessage = {
//                     id: Date.now() + 1,
//                     type: 'ai',
//                     content: data.llm_response,
//                     contexts: data.contexts,
//                     timestamp: new Date(),
//                     metadata: {
//                         original_query: data.original_query,
//                         rewritten_query: data.rewritten_query,
//                         query_rewriting_used: data.query_rewriting_used,
//                         total_contexts: data.total_contexts,
//                         history_used: data.history_used,
//                         search_time_ms: data.search_time_ms
//                     }
//                 };
//                 setMessages(prev => [...prev, aiMessage]);
//             } else {
//                 const errorData = await safeJsonParse(response);
//                 throw new Error(errorData.detail || `Server error: ${response.status}`);
//             }
//         } catch (error) {
//             console.error('Error sending message:', error);
//             const errorMessage = {
//                 id: Date.now() + 1,
//                 type: 'ai',
//                 content: `❌ Xin lỗi, đã có lỗi xảy ra: ${error.message}. Vui lòng thử lại sau.`,
//                 timestamp: new Date()
//             };
//             setMessages(prev => [...prev, errorMessage]);
//             setError(error.message);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleKeyPress = (e) => {
//         if (e.key === 'Enter' && !e.shiftKey) {
//             e.preventDefault();
//             handleSendMessage();
//         }
//     };

//     return (
//         <div className="flex-1 flex flex-col h-full bg-gray-50">
//             {/* Header */}
//             <div className="border-b border-gray-200 bg-white p-4 shadow-sm">
//                 <div className="flex items-center justify-between gap-4">
//                     <div className="flex items-center gap-4">
//                         <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
//                             <MessageCircle className="w-5 h-5 text-blue-600" />
//                             Trò chuyện với AI
//                         </h3>
//                         <select
//                             value={selectedFileType}
//                             onChange={(e) => setSelectedFileType(e.target.value)}
//                             className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
//                         >
//                             {fileTypes.map(type => (
//                                 <option key={type} value={type}>{type}</option>
//                             ))}
//                         </select>
//                     </div>

//                     <div className="flex items-center gap-3">
//                         {/* Query Rewriting Toggle */}
//                         <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
//                             <input
//                                 type="checkbox"
//                                 checked={queryRewriting}
//                                 onChange={(e) => setQueryRewriting(e.target.checked)}
//                                 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//                             />
//                             <span>Query Rewriting</span>
//                         </label>

//                         {/* Reset Button */}
//                         <button
//                             onClick={handleResetConversation}
//                             className="px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
//                             title="Bắt đầu cuộc hội thoại mới"
//                         >
//                             <Trash2 className="w-4 h-4" />
//                             Reset
//                         </button>
//                     </div>
//                 </div>

//                 {/* Session Info */}
//                 {sessionId && (
//                     <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
//                         <History className="w-3 h-3" />
//                         Session ID: {sessionId.substring(0, 30)}...
//                     </div>
//                 )}

//                 {error && (
//                     <div className="mt-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
//                         ⚠️ {error}
//                     </div>
//                 )}
//             </div>

//             {/* Messages Container */}
//             <div className="flex-1 overflow-y-auto p-4 space-y-4">
//                 {messages.length === 0 && (
//                     <div className="text-center py-12">
//                         <Bot className="w-16 h-16 text-blue-500 mx-auto mb-4" />
//                         <h3 className="text-xl font-medium text-gray-900 mb-2">
//                             Bắt đầu cuộc trò chuyện
//                         </h3>
//                         <p className="text-gray-600 mb-4">
//                             Hỏi tôi bất cứ điều gì về tài liệu trong hệ thống
//                         </p>
//                         <div className="text-sm text-gray-500">
//                             💡 Mẹo: AI sẽ nhớ ngữ cảnh câu hỏi trước đó
//                         </div>
//                     </div>
//                 )}

//                 {messages.map((message) => (
//                     <div
//                         key={message.id}
//                         className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
//                     >
//                         <div
//                             className={`max-w-3xl px-4 py-3 rounded-lg ${message.type === 'user'
//                                 ? 'bg-blue-600 text-white'
//                                 : 'bg-white border border-gray-200 shadow-sm'
//                                 }`}
//                         >
//                             {/* Message Content */}
//                             <div className={`prose prose-sm max-w-none ${message.type === 'user' ? 'prose-invert' : ''}`}>
//                                 <ReactMarkdown remarkPlugins={[remarkGfm]}>
//                                     {message.content}
//                                 </ReactMarkdown>
//                             </div>

//                             {/* AI Metadata */}
//                             {message.type === 'ai' && message.metadata && (
//                                 <div className="mt-3 pt-3 border-t border-gray-200">
//                                     <div className="text-xs text-gray-500 space-y-1">
//                                         {message.metadata.query_rewriting_used && (
//                                             <div className="bg-blue-50 px-2 py-1 rounded">
//                                                 <span className="font-semibold">🔄 Query Rewriting:</span>
//                                                 <div className="mt-1">
//                                                     <div><strong>Gốc:</strong> {message.metadata.original_query}</div>
//                                                     <div><strong>Viết lại:</strong> {message.metadata.rewritten_query}</div>
//                                                 </div>
//                                             </div>
//                                         )}
//                                         <div className="flex gap-3">
//                                             <span>📚 {message.metadata.total_contexts} tài liệu</span>
//                                             <span>💬 {message.metadata.history_used} lịch sử</span>
//                                             <span>⏱️ {message.metadata.search_time_ms}ms</span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Context Sources */}
//                             {message.contexts && message.contexts.length > 0 && (
//                                 <div className="mt-3 pt-3 border-t border-gray-200">
//                                     <p className="text-xs text-gray-500 mb-2 font-semibold">📖 Nguồn tham khảo:</p>
//                                     <div className="space-y-2">
//                                         {message.contexts.slice(0, 3).map((context, index) => (
//                                             <div key={index} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
//                                                 <div className="flex justify-between items-start mb-1">
//                                                     <p className="font-semibold text-gray-700">
//                                                         {context.metadata.filename}
//                                                     </p>
//                                                     <span className="text-green-600 font-medium">
//                                                         {(context.metadata.similarity_score * 100).toFixed(1)}%
//                                                     </span>
//                                                 </div>
//                                                 <p className="text-gray-700 line-clamp-2">{context.content}</p>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Timestamp */}
//                             <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
//                                 {message.timestamp.toLocaleTimeString('vi-VN')}
//                             </div>
//                         </div>
//                     </div>
//                 ))}

//                 {/* Loading Indicator */}
//                 {isLoading && (
//                     <div className="flex justify-start">
//                         <div className="bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-lg">
//                             <div className="flex items-center gap-2">
//                                 <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
//                                 <span className="text-gray-600">AI đang phân tích...</span>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 <div ref={messagesEndRef} />
//             </div>

//             {/* Input Area */}
//             <div className="border-t border-gray-200 bg-white p-4 shadow-lg">
//                 <div className="flex gap-3">
//                     <textarea
//                         value={inputMessage}
//                         onChange={(e) => setInputMessage(e.target.value)}
//                         onKeyPress={handleKeyPress}
//                         placeholder="Nhập câu hỏi của bạn... (Enter để gửi, Shift+Enter để xuống dòng)"
//                         className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                         rows="2"
//                         disabled={isLoading || !sessionId}
//                     />
//                     <button
//                         onClick={handleSendMessage}
//                         disabled={!inputMessage.trim() || isLoading || !sessionId}
//                         className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
//                     >
//                         <Send className="w-5 h-5" />
//                         {isLoading ? 'Đang gửi...' : 'Gửi'}
//                     </button>
//                 </div>
//                 {!sessionId && (
//                     <div className="mt-2 text-xs text-amber-600">
//                         ⚠️ Đang khởi tạo phiên làm việc...
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default ChatView;