(function() {
    const chatConfig = {
        // 对应 chat_base_url
        chatBaseUrl: (window.envConfig && envConfig.chat_base_url) || (typeof chat_base_url !== 'undefined' && chat_base_url) || '',
        // 对应 ase_url / base_url（客服接口域名）
        apiBaseUrl: (window.envConfig && envConfig.base_url) || (typeof base_url !== 'undefined' && base_url) || '',
        // 对应 upload_base_url
        uploadBaseUrl: (window.envConfig && envConfig.upload_base_url) || (typeof upload_base_url !== 'undefined' && upload_base_url) || ''
    };

    function getUrlParam(name) {
        const match = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function getToken() {
        if (window.GLJsBridge && typeof window.GLJsBridge.getToken === 'function') {
            try {
                const appToken = window.GLJsBridge.getToken();
                if (appToken && appToken !== 'x') return String(appToken);
            } catch (e) {}
        }
        const urlToken = getUrlParam('token');
        if (urlToken) return urlToken;
        const titleParam = getUrlParam('title');
        if (titleParam && titleParam.includes('token=')) {
            const match = titleParam.match(/token=([^&]+)/);
            if (match) return decodeURIComponent(match[1]);
        }
        return null;
    }

    function getLang() {
        // 语言策略：只有 EN 用英文，其它全部按 AR 处理
        let lang = null;
        if (window.EGMirror && typeof window.EGMirror.detectLang === 'function') {
            lang = window.EGMirror.detectLang();
        } else if (window.GLJsBridge && typeof window.GLJsBridge.getLanguage === 'function') {
            try {
                lang = window.GLJsBridge.getLanguage();
            } catch (e) {}
        } else {
            const urlLang = getUrlParam('lang');
            if (urlLang) lang = urlLang;
        }
        lang = (lang || 'en').toLowerCase();
        return lang === 'en' ? 'en' : 'ar';
    }

    const CHAT_I18N = {
        en: {
            placeholder: 'Please enter your question',
            send: 'Send',
            loadHistory: 'Load History',
            allLoaded: 'All loaded'
        },
        ar: {
            placeholder: 'يرجى إدخال سؤالك',
            send: 'إرسال',
            loadHistory: 'تحميل السجل',
            allLoaded: 'تم تحميل الكل'
        }
    };

    function applyChatI18n() {
        const lang = getLang();
        const pack = CHAT_I18N[lang] || CHAT_I18N.en;
        try {
            const input = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            const loadHistoryBtn = document.getElementById('loadHistoryBtn');
            const allLoadedEl = document.getElementById('allLoaded');
            if (input && pack.placeholder) input.placeholder = pack.placeholder;
            if (sendBtn && pack.send) sendBtn.textContent = pack.send;
            if (loadHistoryBtn && pack.loadHistory) loadHistoryBtn.textContent = pack.loadHistory;
            if (allLoadedEl && pack.allLoaded) allLoadedEl.textContent = pack.allLoaded;
        } catch (e) {}
    }

    function saveTokenAndLang() {
        const urlToken = getUrlParam('token');
        const urlLang = getUrlParam('lang');
        let token = urlToken;
        let lang = urlLang;
        if (!token && window.GLJsBridge && typeof window.GLJsBridge.getToken === 'function') {
            try {
                const t = window.GLJsBridge.getToken();
                if (t && t !== 'x') token = t;
            } catch (e) {}
        }
        if (!lang && window.GLJsBridge && typeof window.GLJsBridge.getLanguage === 'function') {
            try { lang = window.GLJsBridge.getLanguage() || 'en'; } catch (e) { lang = 'en'; }
        }
        try {
            if (token) localStorage.setItem('op_token', token);
            if (lang) localStorage.setItem('op_lang', lang);
        } catch (e) {}
    }

    function formatTime(timeStr) {
        if (!timeStr) return '';
        const date = new Date(timeStr);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return hours + ':' + minutes;
    }

    function generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function htmlDecode(text) {
        const temp = document.createElement('div');
        temp.innerHTML = text;
        return temp.innerText || temp.textContent;
    }

    function getCountryAbbr() {
        try {
            if (window.GLJsBridge) {
                if (typeof window.GLJsBridge.getBaseConfigInfo === 'function') {
                    const infoStr = window.GLJsBridge.getBaseConfigInfo();
                    const info = infoStr ? JSON.parse(infoStr) : null;
                    const c = info && (info.country || info.abbr);
                    if (c) return String(c).toUpperCase();
                }
                if (typeof window.GLJsBridge.getCommonParam === 'function') {
                    const paramStr = window.GLJsBridge.getCommonParam();
                    const param = paramStr ? JSON.parse(paramStr) : null;
                    if (param && param.abbr) return String(param.abbr).toUpperCase();
                }
            }
        } catch (e) {}
        try {
            const abbr = localStorage.getItem('op_abbr');
            if (abbr) return String(abbr).toUpperCase();
        } catch (e) {}
        return '';
    }

    saveTokenAndLang();

    const ChatApp = {
        token: getToken(),
        countryAbbr: getCountryAbbr(),
        ws: null,
        chatMessages: [],
        pendingMessages: {},
        failMessages: [],
        reconnectTimer: null,
        reconnectTimes: 0,
        welcomeTimes: 0,
        maxLeaveMsgNum: 0,
        historyTimes: 0,
        isAllHistory: false,
        isHistoryLoading: false,
        messageTimeout: 5000,

        init() {
            applyChatI18n();
            this.bindEvents();
            this.resizeInput();
            this.connect();
        },

        bindEvents() {
            const sendBtn = document.getElementById('sendBtn');
            const messageInput = document.getElementById('messageInput');
            const uploadBtn = document.getElementById('uploadBtn');
            const imageInput = document.getElementById('imageInput');
            const loadHistoryBtn = document.getElementById('loadHistoryBtn');
            const messageBox = document.getElementById('messageBox');

            sendBtn.addEventListener('click', () => this.sendMessage());
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            messageInput.addEventListener('input', () => this.resizeInput());
            uploadBtn.addEventListener('click', () => imageInput.click());
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
            loadHistoryBtn.addEventListener('click', () => this.loadHistory());
            messageBox.addEventListener('scroll', () => this.handleScroll());
        },

        connect() {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
            this.ws = new WebSocket(chatConfig.chatBaseUrl);
            this.ws.onopen = () => this.onOpen();
            this.ws.onmessage = (e) => this.onMessage(e);
            this.ws.onclose = () => this.onClose();
            this.ws.onerror = () => this.onError();
        },

        onOpen() {
            if (!this.token) {
                this.addMessage({
                    position: 'left',
                    type: 'back_list',
                    content: 'Connected. Missing token to login — open from App or use URL with ?token=xxx'
                });
                return;
            }
            let source = {};
            try {
                if (window.GLJsBridge && typeof window.GLJsBridge.getCommonParam === 'function') {
                    source = JSON.parse(window.GLJsBridge.getCommonParam() || '{}') || {};
                }
            } catch (e) {}
            this.sendWSMessage({
                type: 'login',
                token: this.token,
                source: source
            });
        },

        onMessage(event) {
            const data = JSON.parse(event.data);
            const msgType = data.type;

            if (msgType === 'ping') {
                this.sendWSMessage({ type: 'pong', token: this.token });
                return;
            }

            if (msgType === 'login') {
                this.handleLogin(data);
                return;
            }

            if (msgType === 'say' || msgType === 'sayAdmin') {
                this.handleSayMessage(data, msgType);
                return;
            }

            if (msgType === 'leaveMsg') {
                this.handleLeaveMsg(data);
                return;
            }

            if (msgType === 'leave') {
                this.handleLeave(data);
                return;
            }

            if (msgType === 'file') {
                this.handleFile(data);
                return;
            }

            if (msgType === 'loginFail') {
                this.addMessage({
                    position: 'left',
                    type: 'back_list',
                    content: 'Login failed, please try again'
                });
                return;
            }

            if (msgType === 'logout') {
                this.ws.close();
                return;
            }
        },

        handleLogin(data) {
            if (this.reconnectTimes === 1) {
                this.addMessage({
                    position: 'left',
                    type: 'back_list',
                    content: 'session relink'
                });
                this.reconnectTimes = 0;
                if (this.reconnectTimer) {
                    clearInterval(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
                this.resendFailMessages();
            }

            if (this.welcomeTimes === 0) {
                const now = new Date();
                const indiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                const hour = indiaTime.getHours();
                if (hour >= 23 || hour < 8) {
                    this.addMessage({
                        position: 'left',
                        content: 'The working hours of manual customer service are AM08:00-PM11:00. If the recharge has not arrived, please submit it yourself.'
                    });
                }
                this.welcomeTimes = 1;
            }

            setTimeout(() => {
                this.getLeaveMessage();
            }, 200);
        },

        handleSayMessage(data, msgType) {
            this.maxLeaveMsgNum = 0;
            if (this.pendingMessages[data.msgId]) {
                clearTimeout(this.pendingMessages[data.msgId]);
                delete this.pendingMessages[data.msgId];
            }

            const foundIndex = this.chatMessages.findIndex(v => v.msgId === data.msgId);
            if (foundIndex !== -1) {
                this.chatMessages[foundIndex].time = data.time;
                this.chatMessages[foundIndex].un_check = 0;
                this.chatMessages[foundIndex].msg_id = data.msgId;
                this.chatMessages[foundIndex].type = msgType;
                this.chatMessages[foundIndex].content = htmlDecode(data.content);
                this.render();
            } else {
                this.addMessage({
                    type: msgType,
                    position: msgType === 'sayAdmin' ? 'left' : 'right',
                    time: data.time,
                    content: htmlDecode(data.content),
                    msg_id: data.msgId
                });
            }
            this.sendWSMessage({ type: 'read' });
            this.scrollToBottom();
        },

        handleLeaveMsg(data) {
            const isImage = typeof data.data === 'string' && /^https?:\/\//.test(data.data);
            const backMsg = {
                position: 'right',
                content: data.content,
                data: data.data,
                time: data.time,
                type: isImage ? 'file' : undefined
            };
            const foundIndex = this.chatMessages.findIndex(v => v.msgId === data.msgId);
            if (foundIndex !== -1) {
                this.chatMessages[foundIndex].time = data.time;
                this.chatMessages[foundIndex].un_check = 0;
                this.chatMessages[foundIndex].msg_id = 0;
                this.chatMessages[foundIndex].data = data.data;
                this.chatMessages[foundIndex].type = backMsg.type;
                this.chatMessages[foundIndex].content = data.content;
                this.render();
            } else {
                this.addMessage(backMsg);
            }
            this.maxLeaveMsgNum += 1;
            this.scrollToBottom();
        },

        handleLeave(data) {
            if (data.list && data.list.length > 0) {
                data.list.reverse();
                data.list.forEach(item => {
                    this.addMessage({
                        position: 'left',
                        type: item.type,
                        msg_id: item.msg_id,
                        content: item.content,
                        data: item.type === 'fileAdmin' || item.type === 'file' ? item.content : null,
                        time: data.time
                    });
                });
                this.sendWSMessage({ type: 'read' });
                this.scrollToBottom();
            }
        },

        handleFile(data) {
            this.addMessage({
                type: 'file',
                position: data.to_client_id ? 'left' : 'right',
                content: '',
                data: data.data,
                time: data.time
            });
            this.scrollToBottom();
        },

        onClose() {
            if (this.reconnectTimes >= 1) return;
            this.addMessage({
                type: 'back_list',
                position: 'left',
                content: 'Session offline timeout.'
            });
            this.startReconnect();
        },

        onError() {
            if (this.reconnectTimes >= 1) return;
            this.addMessage({
                position: 'left',
                type: 'back_list',
                content: 'Session offline timeout.'
            });
            this.startReconnect();
        },

        startReconnect() {
            if (this.reconnectTimer) return;
            this.reconnectTimes = 1;
            this.reconnectTimer = setInterval(() => {
                this.connect();
            }, 5000);
        },

        resendFailMessages() {
            if (this.failMessages.length === 0) return;
            let idx = 0;
            this.failMessages.forEach(item => {
                this.chatMessages = this.chatMessages.filter(v => !(v.un_check && v.msgId === item.msgId));
                setTimeout(() => {
                    this.sendWSMessage(item);
                }, idx * 60);
                idx++;
            });
            this.failMessages = [];
        },

        resizeInput() {
            const input = document.getElementById('messageInput');
            if (!input) return;
            const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 100;
            const minH = 0.72 * rem;
            const maxH = 2.88 * rem;
            input.style.height = 'auto';
            const h = Math.max(minH, Math.min(input.scrollHeight, maxH));
            input.style.height = h + 'px';
            input.style.overflowY = input.scrollHeight > maxH ? 'auto' : 'hidden';
        },

        sendMessage() {
            const input = document.getElementById('messageInput');
            const content = input.value.trim();
            if (!content) {
                return;
            }
            if (this.maxLeaveMsgNum >= 3) {
                this.addMessage({
                    position: 'left',
                    content: 'The customer service is currently offline, leaving a maximum of three messages'
                });
                return;
            }

            const unCheck = (!this.ws || this.ws.readyState !== WebSocket.OPEN) ? 1 : 0;
            const msgId = generateRandomString(16);

            if (unCheck === 1) {
                this.addMessage({
                    content: content,
                    msgId: msgId,
                    time: '',
                    un_check: 1
                });
                this.failMessages.push({
                    type: 'say',
                    content: content,
                    msgId: msgId
                });
            } else {
                // 在线状态：发的时候不 push，只有服务端返回（say/sayAdmin 或 leaveMsg）才展示
                this.sendWSMessage({
                    type: 'say',
                    msgId: msgId,
                    content: content,
                    time: ''
                });
            }

            input.value = '';
            this.resizeInput();
            this.scrollToBottom();
        },

        handleImageUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            // 统一加上场景标记
            formData.append('scene', 'gold');

            fetch(chatConfig.uploadBaseUrl + '/user/file/image', {
                method: 'POST',
                headers: {
                    'authorization': this.token || ''
                },
                body: formData
            })
            .then(res => res.json())
            .then(res => {
                if (res.code === 200 && res.data && res.data[0]) {
                    const image = res.data[0].webPath;
                    const unCheck = (!this.ws || this.ws.readyState !== WebSocket.OPEN) ? 1 : 0;
                    const fileObj = {
                        type: 'file',
                        data: image
                    };
                    if (unCheck) {
                        this.failMessages.push(fileObj);
                    }
                    this.sendWSMessage(fileObj);
                    // 与 Vue 一致：无论在线/离线都不先 addMessage，只等服务端返回 file 或 leaveMsg 再展示，避免出现 2 条
                    this.scrollToBottom();
                }
            })
            .catch(err => {
                console.error('Upload failed:', err);
            });

            e.target.value = '';
        },

        loadHistory() {
            if (this.isHistoryLoading || this.isAllHistory) return;
            this.isHistoryLoading = true;
            document.getElementById('loadHistoryBtn').textContent = 'Loading...';

            const recordId = this.chatMessages.length > 0 ? (this.chatMessages[0].id || '') : '';
            const params = {
                recordId: recordId,
                countryAbbr: this.countryAbbr || '',
                pageSize: '15',
                // 统一加上场景标记
                scene: 'gold'
            };

            fetch(chatConfig.apiBaseUrl + '/user/chat/historyUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': this.token || ''
                },
                body: JSON.stringify(params)
            })
            .then(res => res.json())
            .then(res => {
                this.isHistoryLoading = false;
                applyChatI18n();
                document.getElementById('historyBtn').style.display = 'none';

                if (res.code === 200 && res.data && res.data.rows) {
                    const historyData = res.data.rows;
                    if (historyData.length === 0) {
                        this.isAllHistory = true;
                        document.getElementById('allLoaded').style.display = 'block';
                    } else {
                        historyData.forEach(item => {
                            const position = item.type === 'say' || item.type === 'file' ? 'right' : 'left';
                            const msg = {
                                position: position,
                                id: item.id,
                                type: item.type,
                                time: item.msg_time,
                                msg_id: item.msg_id,
                                content: item.content,
                                data: item.content
                            };
                            if (this.historyTimes === 0) {
                                const isSame = this.chatMessages.find(v => item.msg_id === v.msg_id);
                                if (!isSame) this.chatMessages.unshift(msg);
                            } else {
                                this.chatMessages.unshift(msg);
                            }
                        });
                        this.render();
                        if (this.historyTimes === 0) {
                            setTimeout(() => {
                                const box = document.getElementById('messageBox');
                                box.scrollTop = 40;
                            }, 100);
                        }
                    }
                    this.historyTimes += 1;
                }
            })
            .catch(err => {
                this.isHistoryLoading = false;
                applyChatI18n();
                try { document.getElementById('historyBtn').style.display = ''; } catch (e) {}
                console.error('Load history failed:', err);
            });
        },

        handleScroll() {
            const box = document.getElementById('messageBox');
            if (box.scrollTop === 0 && !this.isAllHistory && !this.isHistoryLoading) {
                document.getElementById('historyBtn').style.display = 'none';
                this.loadHistory();
                setTimeout(() => {
                    box.scrollTop = 200;
                }, 100);
            }
        },

        sendWSMessage(obj) {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                return;
            }
            obj.token = this.token;
            obj.countryAbbr = this.countryAbbr || '';
            if (!obj.msgId) {
                obj.msgId = generateRandomString(16);
            }
            try {
                this.ws.send(JSON.stringify(obj));
            } catch (e) {
                console.error('Send failed:', e);
            }
        },

        addMessage(msg) {
            if (!msg.position) msg.position = 'right';
            this.chatMessages.push(msg);
            this.render();
        },

        render() {
            const box = document.getElementById('messageBox');
            const wasAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 50;
            
            box.innerHTML = this.chatMessages.map((item, i) => {
                const isLeft = item.position === 'left';
                const msgClass = isLeft ? 'kf-message' : 'user-message';
                const timeStr = formatTime(item.time);
                let contentHtml = '';
                if (item.type === 'file' || item.type === 'fileAdmin') {
                    // 不走 ChatApp.previewImage，避免被其它脚本覆盖回 window.open
                    // 同时尽量阻止容器/浏览器的默认点击行为
                    contentHtml = `<span class="content-area--img"><img src="${item.data}" onclick="try{event&&event.preventDefault&&event.preventDefault();event&&event.stopPropagation&&event.stopPropagation()}catch(e){};window.__opChatPreviewImage&&window.__opChatPreviewImage('${item.data}');return false;"></span>`;
                } else if (item.type === 'back_list') {
                    contentHtml = `<div class="content"><div class="back_list">${item.content}</div></div>`;
                } else {
                    contentHtml = `<div class="content">${item.content || ''}</div>`;
                }
                const errorHtml = item.un_check 
                    ? `<div class="content-error" onclick="ChatApp.resendMessage(${i})">↻</div>`
                    : '';
                const avatarSrc = isLeft ? './chats/kf_v1.png' : './chats/yh.png';
                const avatarHtml = item.type !== 'list' && item.type !== 'back_list' && item.type !== 'upload'
                    ? `<img class="avatar" src="${avatarSrc}" alt="">`
                    : '';

                return `<div class="${msgClass}"><div class="group-content"><div class="info"><div class="content"><div class="content-area">${contentHtml}</div><div class="content-time">${timeStr}</div>${errorHtml}</div></div>${avatarHtml}</div></div>`;
            }).join('');

            if (wasAtBottom) {
                this.scrollToBottom();
            }
        },

        resendMessage(index) {
            const msg = this.chatMessages[index];
            if (!msg) return;
            
            if (this.ws.readyState !== WebSocket.OPEN) {
                msg.un_check = 1;
                this.render();
                return;
            }

            this.chatMessages.splice(index, 1);
            if (this.pendingMessages[msg.msgId]) {
                clearTimeout(this.pendingMessages[msg.msgId]);
                delete this.pendingMessages[msg.msgId];
            }

            this.addMessage({
                content: msg.content,
                msgId: msg.msgId,
                time: '',
                position: 'right',
                un_check: 0
            });

            this.pendingMessages[msg.msgId] = setTimeout(() => {
                const m = this.chatMessages.find(v => v.msgId === msg.msgId && !v.msg_id);
                if (m) m.un_check = 1;
                this.render();
                delete this.pendingMessages[msg.msgId];
            }, this.messageTimeout);

            this.sendWSMessage({
                type: 'say',
                content: msg.content,
                msgId: msg.msgId,
                time: ''
            });
            this.scrollToBottom();
        },

        getLeaveMessage() {
            this.sendWSMessage({ type: 'lea', pageSize: 999 });
        },

        previewImage(url) {
            try {
                const mask = document.getElementById('imgPreviewMask');
                const img = document.getElementById('imgPreviewImg');
                const backdrop = document.getElementById('imgPreviewBackdrop');
                const closeBtn = document.getElementById('imgPreviewClose');
                if (!mask || !img) return;

                img.src = url || '';
                mask.style.display = 'block';

                const hide = () => {
                    mask.style.display = 'none';
                    img.src = '';
                };

                if (backdrop && !backdrop.__bindPreview) {
                    backdrop.__bindPreview = true;
                    backdrop.addEventListener('click', hide);
                }
                if (closeBtn && !closeBtn.__bindPreview) {
                    closeBtn.__bindPreview = true;
                    closeBtn.addEventListener('click', hide);
                }
                if (!document.__bindPreviewEsc) {
                    document.__bindPreviewEsc = true;
                    document.addEventListener('keydown', (e) => {
                        if (e && e.key === 'Escape') hide();
                    });
                }
            } catch (e) {}
        },

        scrollToBottom() {
            setTimeout(() => {
                const box = document.getElementById('messageBox');
                box.scrollTop = box.scrollHeight;
            }, 100);
        }
    };

    // 单独挂一个全局方法，避免 ChatApp 被覆盖导致预览回退到 window.open
    window.__opChatPreviewImage = function (url) {
        try {
            if (window.ChatApp && typeof window.ChatApp.previewImage === 'function') {
                window.ChatApp.previewImage(url);
            }
        } catch (e) {}
    };

    window.ChatApp = ChatApp;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ChatApp.init());
    } else {
        ChatApp.init();
    }
})();

(function init() {
    if (window.GLJsBridge) {
        window.GLJsBridge.setToolbarVisibility('0'); // 原生容器提供
    }
})();
