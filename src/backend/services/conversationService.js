/**
 * conversationService.js
 * Lưu lịch sử hội thoại + state phân trang theo session
 */

const sessions = new Map();
const MAX_HISTORY = 10;
const SESSION_TTL = 30 * 60 * 1000; // 30 phút

function _getOrCreate(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            messages: [],
            state: {},   // Trạng thái phân trang, intent cuối, v.v.
            lastAccess: Date.now()
        });
    }
    const session = sessions.get(sessionId);

    // Kiểm tra TTL
    if (Date.now() - session.lastAccess > SESSION_TTL) {
        sessions.delete(sessionId);
        return _getOrCreate(sessionId);
    }

    session.lastAccess = Date.now();
    return session;
}

function getHistory(sessionId) {
    return _getOrCreate(sessionId).messages;
}

function addMessage(sessionId, role, content) {
    const session = _getOrCreate(sessionId);
    session.messages.push({ role, content });
    if (session.messages.length > MAX_HISTORY * 2) {
        session.messages = session.messages.slice(-MAX_HISTORY * 2);
    }
}

/** Lấy state phân trang + intent cuối */
function getState(sessionId) {
    return _getOrCreate(sessionId).state;
}

/** Cập nhật state */
function setState(sessionId, newState) {
    const session = _getOrCreate(sessionId);
    session.state = { ...session.state, ...newState };
}

function formatHistoryForPrompt(history) {
    if (!history.length) return '';
    return '\n=== LỊCH SỬ HỘI THOẠI ===\n' +
        history.map(m =>
            m.role === 'user' ? `Người dùng: ${m.content}` : `Trợ lý: ${m.content}`
        ).join('\n') + '\n';
}

function clearSession(sessionId) {
    sessions.delete(sessionId);
}

module.exports = { getHistory, addMessage, getState, setState, formatHistoryForPrompt, clearSession };