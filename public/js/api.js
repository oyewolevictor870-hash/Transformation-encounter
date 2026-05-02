// // ============================================
// // TRANSFORMATION ENCOUNTER - API HELPER
// // ============================================
// TRANSFORMATION ENCOUNTER - API HELPER
// ============================================

const API = {
    baseUrl: 'https://transformation-encounter-production.up.railway.app/api',

    getToken() {
        return localStorage.getItem('te_token');
    },

    getUser() {
        const u = localStorage.getItem('te_user');
        return u ? JSON.parse(u) : null;
    },

    setSession(token, user) {
        localStorage.setItem('te_token', token);
        localStorage.setItem('te_user', JSON.stringify(user));
    },

    clearSession() {
        localStorage.removeItem('te_token');
        localStorage.removeItem('te_user');
    },

    async request(method, endpoint, body = null, isFormData = false) {
        const token = this.getToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (!isFormData && body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
        const isForm = isFormData || body instanceof FormData;

        const config = { method, headers };
        if (body) config.body = isForm ? body : JSON.stringify(body);

        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`, config);
            const data = await res.json();
            if (res.status === 401) {
                this.clearSession();
                window.location.href = '/login.html';
                return;
            }
            return data;
        } catch (err) {
            return { success: false, message: 'Network error. Please check your connection.' };
        }
    },

    get: (endpoint) => API.request('GET', endpoint),
    post: (endpoint, body, isFormData = false) => API.request('POST', endpoint, body, isFormData),
    put: (endpoint, body) => API.request('PUT', endpoint, body),
    delete: (endpoint) => API.request('DELETE', endpoint),

    // Auth
    login: (email, password) => API.post('/auth/login', { email, password }),
    register: (data) => API.post('/auth/register', data),
    me: () => API.get('/auth/me'),

    // Feed
    getFeed: (params = {}) => API.get(`/feed?${new URLSearchParams(params)}`),
    createPost: (formData) => API.post('/feed', formData, true),
    reactToPost: (id, reaction) => API.post(`/feed/${id}/react`, { reaction }),
    commentOnPost: (id, content) => API.post(`/feed/${id}/comment`, { content }),
    bookmarkPost: (id) => API.post(`/feed/${id}/bookmark`),
    getBookmarks: () => API.get('/feed/user/bookmarks'),

    // Prayers
    getPrayers: (params = {}) => API.get(`/prayers?${new URLSearchParams(params)}`),
    submitPrayer: (data) => API.post('/prayers', data),
    prayFor: (id, message = '') => API.post(`/prayers/${id}/pray`, { message }),
    getAllPrayers: () => API.get('/prayers/all'),
    sendEmergencyPrayer: (data) => API.post('/prayers/emergency', data),
    respondToPrayer: (id, content) => API.post(`/prayers/${id}/respond`, { content }),
    markPrayerAnswered: (id) => API.put(`/prayers/${id}/answered`),

    // Testimonies
    getTestimonies: () => API.get('/testimonies'),
    submitTestimony: (formData) => API.post('/testimonies', formData, true),
    getPendingTestimonies: () => API.get('/testimonies/pending'),
    approveTestimony: (id) => API.put(`/testimonies/${id}/approve`),
    rejectTestimony: (id, reason) => API.put(`/testimonies/${id}/reject`, { reason }),

    // Events
    getEvents: () => API.get('/events'),
    getUpcomingEvents: () => API.get('/events/upcoming'),
    createEvent: (formData) => API.post('/events', formData, true),
    rsvpEvent: (id, status) => API.post(`/events/${id}/rsvp`, { status }),
    checkinEvent: (id) => API.post(`/events/${id}/checkin`),

    // Questions
    getQuestions: () => API.get('/questions'),
    askQuestion: (data) => API.post('/questions', data),
    answerQuestion: (id, content) => API.post(`/questions/${id}/answer`, { content }),

    // Giving
    initiatePayment: (data) => API.post('/giving/initiate', data),
    verifyPayment: (reference) => API.post('/giving/verify', { reference }),
    getPaymentHistory: () => API.get('/giving/history'),
    getProjects: () => API.get('/giving/projects'),
    getCurrentDues: () => API.get('/giving/dues/current'),

    // Sermons
    getSermons: (params = {}) => API.get(`/sermons?${new URLSearchParams(params)}`),
    uploadSermon: (formData) => API.post('/sermons', formData, true),
    bookmarkSermon: (id) => API.post(`/sermons/${id}/bookmark`),

    // Celebrations
    getCelebrations: () => API.get('/celebrations'),
    postCelebration: (formData) => API.post('/celebrations', formData, true),
    likeCelebration: (id) => API.post(`/celebrations/${id}/like`),
    commentCelebration: (id, content) => API.post(`/celebrations/${id}/comment`, { content }),

    // Members
    getDirectory: (search = '') => API.get(`/members/directory${search ? '?search=' + search : ''}`),
    getProfile: () => API.get('/members/profile'),
    updateProfile: (formData) => API.request('PUT', '/members/profile', formData, true),
    saveBirthday: (birthday) => API.put('/members/birthday', { birthday }),

    // Polls
    getPolls: () => API.get('/polls'),
    vote: (pollId, optionId) => API.post(`/polls/${pollId}/vote`, { option_id: optionId }),

    // Notifications
    getNotifications: () => API.get('/notifications'),
    markRead: (id) => API.put(`/notifications/${id}/read`),
    markAllRead: () => API.put('/notifications/read/all'),

    // Resources
    getFlyers: () => API.get('/resources/flyers'),
    getGallery: () => API.get('/resources/gallery'),
    getResources: () => API.get('/resources'),
    uploadFlyer: (formData) => API.post('/resources/flyers', formData, true),

    // Misc
    getScripture: () => API.get('/misc/scripture'),
    getLyrics: () => API.get('/misc/lyrics'),
    getNewsletters: () => API.get('/misc/newsletter'),
    getBiblePlans: (status = 'active') => API.get(`/misc/bible-plan?status=${status}`),
    getBiblePlan: () => API.get('/misc/bible-plan'),
    getTodayReading: () => API.get('/misc/bible-plan/today'),
    getPrayerPoints: () => API.get('/misc/prayer-points'),
    getFasting: () => API.get('/misc/fasting'),
    joinFast: (id) => API.post(`/misc/fasting/${id}/join`),
    getVoiceRooms: () => API.get('/misc/voice-rooms'),
    getLiveStream: () => API.get('/misc/livestream'),
    submitContact: (data) => API.post('/misc/contact', data),

    // Admin
    getDashboardStats: () => API.get('/admin/dashboard'),
    getAllMembers: (params = {}) => API.get(`/admin/members?${new URLSearchParams(params)}`),
    getPendingApprovals: () => API.get('/admin/pending'),
    approveMember: (id) => API.put(`/admin/approve/${id}`),
    removeMember: (id) => API.delete(`/admin/member/${id}`),
    changeRole: (id, role) => API.put(`/admin/role/${id}`, { role }),
    getFinancials: (monthYear) => API.get(`/admin/financials${monthYear ? '?month_year=' + monthYear : ''}`),
    setDues: (amount, monthYear) => API.post('/admin/dues/set', { amount, month_year: monthYear }),
    broadcastNotification: (data) => API.post('/admin/notify/all', data),
    openVoiceRoom: (data) => API.post('/admin/voice-rooms', data),
    closeVoiceRoom: (id) => API.put(`/admin/voice-rooms/${id}/close`),
    toggleVoiceRoom: (type, action) => API.post('/admin/voice-room/toggle', { type, action }),
    getWorkerLogs: () => API.get('/admin/logs'),
    getGrowthReport: () => API.get('/admin/reports/growth'),
    deleteContent: (table, id) => API.delete(`/admin/content/${table}/${id}`),
};

// TOAST NOTIFICATIONS
const Toast = {
    show(message, type = 'success', duration = 3500) {
        const container = document.querySelector('.toast-container') || (() => {
            const c = document.createElement('div');
            c.className = 'toast-container';
            document.body.appendChild(c);
            return c;
        })();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, duration);
    },
    success: (msg) => Toast.show(msg, 'success'),
    error: (msg) => Toast.show(msg, 'error'),
    info: (msg) => Toast.show(msg, 'info'),
};

// UTILITY FUNCTIONS
const Utils = {
    formatDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    formatTime(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    },
    formatDateTime(dateStr) {
        if (!dateStr) return '';
        return `${Utils.formatDate(dateStr)} at ${Utils.formatTime(dateStr)}`;
    },
    timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr);
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.floor(h / 24);
        if (d < 7) return `${d}d ago`;
        return Utils.formatDate(dateStr);
    },
    initials(name) {
        return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
    },
    avatar(user, size = 'avatar-md') {
        if (user?.profile_photo) return `<img src="${user.profile_photo}" class="avatar ${size}" alt="${user.full_name}">`;
        return `<div class="avatar-placeholder ${size}">${Utils.initials(user?.full_name)}</div>`;
    },
    currency(amount) {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    },
    requireAuth() {
        const user = API.getUser();
        if (!user || !API.getToken()) {
            window.location.href = '/login.html';
            return null;
        }
        return user;
    },
    requireRole: async (roles) => {
        const user = Utils.requireAuth();
        if (!user) return null;
        // Always verify role fresh from server to prevent stale-cache redirect issues
        try {
            const fresh = await API.me();
            if (fresh && fresh.success && fresh.user) {
                API.setSession(API.getToken(), fresh.user);
                if (!roles.includes(fresh.user.role)) {
                    window.location.href = '/member/dashboard.html';
                    return null;
                }
                return fresh.user;
            }
        } catch (e) {}
        // Fallback to cached user if server is unreachable
        if (!roles.includes(user.role)) {
            window.location.href = '/member/dashboard.html';
            return null;
        }
        return user;
    },
    darkMode() {
        const user = API.getUser();
        if (user?.dark_mode) document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle')?.addEventListener('click', async () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            await API.put('/auth/me', { dark_mode: isDark });
        });
    }
};

// MODALS
const Modal = {
    open(id) { document.getElementById(id)?.classList.add('active'); },
    close(id) { document.getElementById(id)?.classList.remove('active'); },
    closeAll() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); }
};

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
    if (e.target.classList.contains('modal-close')) Modal.closeAll();
});

if (window) window.API = API;
if (window) window.Toast = Toast;
if (window) window.Utils = Utils;
if (window) window.Modal = Modal;
// Admin sidebar overlay — auto-close when tapping outside
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    // Create dark overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999';
    document.body.appendChild(overlay);

    // Close sidebar when overlay is tapped
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
    });

    // Watch sidebar class changes to show/hide overlay
    new MutationObserver(() => {
        overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
    }).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
});
// const API = {
//     baseUrl: '/api',

//     getToken() {
//         return localStorage.getItem('te_token');
//     },

//     getUser() {
//         const u = localStorage.getItem('te_user');
//         return u ? JSON.parse(u) : null;
//     },

//     setSession(token, user) {
//         localStorage.setItem('te_token', token);
//         localStorage.setItem('te_user', JSON.stringify(user));
//     },

//     clearSession() {
//         localStorage.removeItem('te_token');
//         localStorage.removeItem('te_user');
//     },

//     async request(method, endpoint, body = null, isFormData = false) {
//         const token = this.getToken();
//         const headers = {};
//         if (token) headers['Authorization'] = `Bearer ${token}`;
//         if (!isFormData && body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
//         const isForm = isFormData || body instanceof FormData;

//         const config = { method, headers };
//         if (body) config.body = isForm ? body : JSON.stringify(body);

//         try {
//             const res = await fetch(`${this.baseUrl}${endpoint}`, config);
//             const data = await res.json();
//             if (res.status === 401) {
//                 this.clearSession();
//                 window.location.href = '/login.html';
//                 return;
//             }
//             return data;
//         } catch (err) {
//             return { success: false, message: 'Network error. Please check your connection.' };
//         }
//     },

//     get: (endpoint) => API.request('GET', endpoint),
//     post: (endpoint, body, isFormData = false) => API.request('POST', endpoint, body, isFormData),
//     put: (endpoint, body) => API.request('PUT', endpoint, body),
//     delete: (endpoint) => API.request('DELETE', endpoint),

//     // Auth
//     login: (email, password) => API.post('/auth/login', { email, password }),
//     register: (data) => API.post('/auth/register', data),
//     me: () => API.get('/auth/me'),

//     // Feed
//     getFeed: (params = {}) => API.get(`/feed?${new URLSearchParams(params)}`),
//     createPost: (formData) => API.post('/feed', formData, true),
//     reactToPost: (id, reaction) => API.post(`/feed/${id}/react`, { reaction }),
//     commentOnPost: (id, content) => API.post(`/feed/${id}/comment`, { content }),
//     bookmarkPost: (id) => API.post(`/feed/${id}/bookmark`),
//     getBookmarks: () => API.get('/feed/user/bookmarks'),

//     // Prayers
//     getPrayers: (params = {}) => API.get(`/prayers?${new URLSearchParams(params)}`),
//     submitPrayer: (data) => API.post('/prayers', data),
//     prayFor: (id, message = '') => API.post(`/prayers/${id}/pray`, { message }),
//     getAllPrayers: () => API.get('/prayers/all'),
//     sendEmergencyPrayer: (data) => API.post('/prayers/emergency', data),
//     respondToPrayer: (id, content) => API.post(`/prayers/${id}/respond`, { content }),
//     markPrayerAnswered: (id) => API.put(`/prayers/${id}/answered`),

//     // Testimonies
//     getTestimonies: () => API.get('/testimonies'),
//     submitTestimony: (formData) => API.post('/testimonies', formData, true),
//     getPendingTestimonies: () => API.get('/testimonies/pending'),
//     approveTestimony: (id) => API.put(`/testimonies/${id}/approve`),
//     rejectTestimony: (id, reason) => API.put(`/testimonies/${id}/reject`, { reason }),

//     // Events
//     getEvents: () => API.get('/events'),
//     getUpcomingEvents: () => API.get('/events/upcoming'),
//     createEvent: (formData) => API.post('/events', formData, true),
//     rsvpEvent: (id, status) => API.post(`/events/${id}/rsvp`, { status }),
//     checkinEvent: (id) => API.post(`/events/${id}/checkin`),

//     // Questions
//     getQuestions: () => API.get('/questions'),
//     askQuestion: (data) => API.post('/questions', data),
//     answerQuestion: (id, content) => API.post(`/questions/${id}/answer`, { content }),

//     // Giving
//     initiatePayment: (data) => API.post('/giving/initiate', data),
//     verifyPayment: (reference) => API.post('/giving/verify', { reference }),
//     getPaymentHistory: () => API.get('/giving/history'),
//     getProjects: () => API.get('/giving/projects'),
//     getCurrentDues: () => API.get('/giving/dues/current'),

//     // Sermons
//     getSermons: (params = {}) => API.get(`/sermons?${new URLSearchParams(params)}`),
//     uploadSermon: (formData) => API.post('/sermons', formData, true),
//     bookmarkSermon: (id) => API.post(`/sermons/${id}/bookmark`),

//     // Celebrations
//     getCelebrations: () => API.get('/celebrations'),
//     postCelebration: (formData) => API.post('/celebrations', formData, true),
//     likeCelebration: (id) => API.post(`/celebrations/${id}/like`),
//     commentCelebration: (id, content) => API.post(`/celebrations/${id}/comment`, { content }),

//     // Members
//     getDirectory: (search = '') => API.get(`/members/directory${search ? '?search=' + search : ''}`),
//     getProfile: () => API.get('/members/profile'),
//     updateProfile: (formData) => API.request('PUT', '/members/profile', formData, true),
//     saveBirthday: (birthday) => API.put('/members/birthday', { birthday }),

//     // Polls
//     getPolls: () => API.get('/polls'),
//     vote: (pollId, optionId) => API.post(`/polls/${pollId}/vote`, { option_id: optionId }),

//     // Notifications
//     getNotifications: () => API.get('/notifications'),
//     markRead: (id) => API.put(`/notifications/${id}/read`),
//     markAllRead: () => API.put('/notifications/read/all'),

//     // Resources
//     getFlyers: () => API.get('/resources/flyers'),
//     getGallery: () => API.get('/resources/gallery'),
//     getResources: () => API.get('/resources'),
//     uploadFlyer: (formData) => API.post('/resources/flyers', formData, true),

//     // Misc
//     getScripture: () => API.get('/misc/scripture'),
//     getLyrics: () => API.get('/misc/lyrics'),
//     getNewsletters: () => API.get('/misc/newsletter'),
//     getBiblePlans: (status = 'active') => API.get(`/misc/bible-plan?status=${status}`),
//     getBiblePlan: () => API.get('/misc/bible-plan'),
//     getTodayReading: () => API.get('/misc/bible-plan/today'),
//     getPrayerPoints: () => API.get('/misc/prayer-points'),
//     getFasting: () => API.get('/misc/fasting'),
//     joinFast: (id) => API.post(`/misc/fasting/${id}/join`),
//     getVoiceRooms: () => API.get('/misc/voice-rooms'),
//     getLiveStream: () => API.get('/misc/livestream'),
//     submitContact: (data) => API.post('/misc/contact', data),

//     // Admin
//     getDashboardStats: () => API.get('/admin/dashboard'),
//     getAllMembers: (params = {}) => API.get(`/admin/members?${new URLSearchParams(params)}`),
//     getPendingApprovals: () => API.get('/admin/pending'),
//     approveMember: (id) => API.put(`/admin/approve/${id}`),
//     removeMember: (id) => API.delete(`/admin/member/${id}`),
//     changeRole: (id, role) => API.put(`/admin/role/${id}`, { role }),
//     getFinancials: (monthYear) => API.get(`/admin/financials${monthYear ? '?month_year=' + monthYear : ''}`),
//     setDues: (amount, monthYear) => API.post('/admin/dues/set', { amount, month_year: monthYear }),
//     broadcastNotification: (data) => API.post('/admin/notify/all', data),
//     openVoiceRoom: (data) => API.post('/admin/voice-rooms', data),
//     closeVoiceRoom: (id) => API.put(`/admin/voice-rooms/${id}/close`),
//     toggleVoiceRoom: (type, action) => API.post('/admin/voice-room/toggle', { type, action }),
//     getWorkerLogs: () => API.get('/admin/logs'),
//     getGrowthReport: () => API.get('/admin/reports/growth'),
//     deleteContent: (table, id) => API.delete(`/admin/content/${table}/${id}`),
// };

// // TOAST NOTIFICATIONS
// const Toast = {
//     show(message, type = 'success', duration = 3500) {
//         const container = document.querySelector('.toast-container') || (() => {
//             const c = document.createElement('div');
//             c.className = 'toast-container';
//             document.body.appendChild(c);
//             return c;
//         })();
//         const toast = document.createElement('div');
//         toast.className = `toast ${type}`;
//         toast.textContent = message;
//         container.appendChild(toast);
//         setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, duration);
//     },
//     success: (msg) => Toast.show(msg, 'success'),
//     error: (msg) => Toast.show(msg, 'error'),
//     info: (msg) => Toast.show(msg, 'info'),
// };

// // UTILITY FUNCTIONS
// const Utils = {
//     formatDate(dateStr) {
//         if (!dateStr) return '';
//         return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
//     },
//     formatTime(dateStr) {
//         if (!dateStr) return '';
//         return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
//     },
//     formatDateTime(dateStr) {
//         if (!dateStr) return '';
//         return `${Utils.formatDate(dateStr)} at ${Utils.formatTime(dateStr)}`;
//     },
//     timeAgo(dateStr) {
//         const diff = Date.now() - new Date(dateStr);
//         const m = Math.floor(diff / 60000);
//         if (m < 1) return 'Just now';
//         if (m < 60) return `${m}m ago`;
//         const h = Math.floor(m / 60);
//         if (h < 24) return `${h}h ago`;
//         const d = Math.floor(h / 24);
//         if (d < 7) return `${d}d ago`;
//         return Utils.formatDate(dateStr);
//     },
//     initials(name) {
//         return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
//     },
//     avatar(user, size = 'avatar-md') {
//         if (user?.profile_photo) return `<img src="${user.profile_photo}" class="avatar ${size}" alt="${user.full_name}">`;
//         return `<div class="avatar-placeholder ${size}">${Utils.initials(user?.full_name)}</div>`;
//     },
//     currency(amount) {
//         return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
//     },
//     requireAuth() {
//         const user = API.getUser();
//         if (!user || !API.getToken()) {
//             window.location.href = '/login.html';
//             return null;
//         }
//         return user;
//     },
//     requireRole: async (roles) => {
//         const user = Utils.requireAuth();
//         if (!user) return null;
//         // Always verify role fresh from server to prevent stale-cache redirect issues
//         try {
//             const fresh = await API.me();
//             if (fresh && fresh.success && fresh.user) {
//                 API.setSession(API.getToken(), fresh.user);
//                 if (!roles.includes(fresh.user.role)) {
//                     window.location.href = '/member/dashboard.html';
//                     return null;
//                 }
//                 return fresh.user;
//             }
//         } catch (e) {}
//         // Fallback to cached user if server is unreachable
//         if (!roles.includes(user.role)) {
//             window.location.href = '/member/dashboard.html';
//             return null;
//         }
//         return user;
//     },
//     darkMode() {
//         const user = API.getUser();
//         if (user?.dark_mode) document.body.classList.add('dark-mode');
//         document.getElementById('darkModeToggle')?.addEventListener('click', async () => {
//             document.body.classList.toggle('dark-mode');
//             const isDark = document.body.classList.contains('dark-mode');
//             await API.put('/auth/me', { dark_mode: isDark });
//         });
//     }
// };

// // MODALS
// const Modal = {
//     open(id) { document.getElementById(id)?.classList.add('active'); },
//     close(id) { document.getElementById(id)?.classList.remove('active'); },
//     closeAll() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); }
// };

// document.addEventListener('click', (e) => {
//     if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
//     if (e.target.classList.contains('modal-close')) Modal.closeAll();
// });

// if (window) window.API = API;
// if (window) window.Toast = Toast;
// if (window) window.Utils = Utils;
// if (window) window.Modal = Modal;
