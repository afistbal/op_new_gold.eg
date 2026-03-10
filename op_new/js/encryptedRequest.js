;(function (global) {
  'use strict';

  /**
   * 加密 POST 请求封装
   * 与 Vue 2/3 及纯 HTML 均兼容，参数通过 options 传入，不传则使用默认从 window/localStorage 读取。
   * 依赖：RequestEncrypt.encryptBody（需先加载 crypto-js.min.js、md5.min.js、requestEncrypt.js）
   */

  function defaultBaseUrl() {
    if (typeof window === 'undefined') return '';
    if (window.envConfig && window.envConfig.base_url) return window.envConfig.base_url;
    if (typeof base_url !== 'undefined' && base_url) return base_url;
    return '';
  }

  function defaultGetToken() {
    if (typeof window === 'undefined') return '';
    if (window.GLJsBridge && typeof window.GLJsBridge.getToken === 'function') {
      try {
        var t = window.GLJsBridge.getToken();
        if (t && t !== 'x') return String(t);
      } catch (e) {}
    }
    try {
      var p = (window.location && window.location.search) ? window.location.search.slice(1).split('&') : [];
      for (var i = 0; i < p.length; i++) {
        var kv = p[i].split('=');
        if (kv[0] === 'token') return decodeURIComponent(kv[1] || '');
      }
    } catch (e) {}
    return '';
  }

  function defaultGetLang() {
    if (typeof window === 'undefined') return 'en';
    if (window.GLJsBridge && typeof window.GLJsBridge.getLanguage === 'function') {
      try {
        var appLang = window.GLJsBridge.getLanguage();
        if (appLang && appLang !== 'x') {
          var lang = (appLang || 'en').toLowerCase().split('-')[0];
          if (['en', 'hi', 'ar'].indexOf(lang) !== -1) return lang;
        }
      } catch (e) {}
    }
    try {
      var search = window.location && window.location.search ? window.location.search : '';
      if (search) {
        var parts = search.slice(1).split('&');
        for (var j = 0; j < parts.length; j++) {
          var kv2 = parts[j].split('=');
          if (kv2[0] === 'lang') return (kv2[1] || 'en').toLowerCase();
        }
      }
      var stored = localStorage.getItem('op_lang');
      if (stored) return stored;
    } catch (e) {}
    return 'en';
  }

  function defaultGetAbbr() {
    if (typeof window === 'undefined') return 'IN';
    try {
      return localStorage.getItem('op_abbr') || 'IN';
    } catch (e) {
      return 'IN';
    }
  }

  /**
   * 发起加密 POST 请求
   * @param {string} path - 接口路径，如 '/user/gdUser/resetPin'
   * @param {object} [bodyObj] - 额外请求体字段，会与 s/abbr/lang/channel/authorization 合并
   * @param {object} [options] - 可选配置，不传则用默认逻辑
   * @param {string} [options.baseUrl] - 接口根地址
   * @param {function} [options.getToken] - 返回 token
   * @param {function} [options.getLang] - 返回 lang
   * @param {function} [options.getAbbr] - 返回 abbr
   * @param {string} [options.channel] - 渠道，默认 'tuig'
   * @returns {Promise<object>} 响应 JSON
   */
  function post(path, bodyObj, options) {
    options = options || {};
    var baseUrl = options.baseUrl != null ? options.baseUrl : defaultBaseUrl();
    var getToken = typeof options.getToken === 'function' ? options.getToken : defaultGetToken;
    var getLang = typeof options.getLang === 'function' ? options.getLang : defaultGetLang;
    var getAbbr = typeof options.getAbbr === 'function' ? options.getAbbr : defaultGetAbbr;
    var channel = options.channel != null ? options.channel : 'tuig';

    if (!baseUrl) return Promise.reject(new Error('no base url'));

    var s = (path && path.charAt(0) === '/') ? path : '/' + (path || '');
    var data = {
      s: s,
      abbr: getAbbr(),
      lang: getLang(),
      // 统一埋点当前场景
      scene: 'gold',
      channel: channel,
      authorization: getToken() || ''
    };
    if (bodyObj && typeof bodyObj === 'object') {
      for (var k in bodyObj) {
        if (Object.prototype.hasOwnProperty.call(bodyObj, k)) data[k] = bodyObj[k];
      }
    }

    var baseForHost = baseUrl.indexOf('://') !== -1 ? baseUrl : 'https://' + baseUrl;
    var host;
    try {
      host = new URL(baseForHost).host;
    } catch (e) {
      return Promise.reject(new Error('invalid base url'));
    }

    var encryptBodyFn = (global.RequestEncrypt && typeof global.RequestEncrypt.encryptBody === 'function')
      ? global.RequestEncrypt.encryptBody
      : null;
    if (!encryptBodyFn) return Promise.reject(new Error('RequestEncrypt.encryptBody not found'));

    var cipher = encryptBodyFn(data, host);
    if (!cipher) return Promise.reject(new Error('encryptBody returned empty'));

    var urlRoot = baseUrl.replace(/\/?$/, '') + '/';

    // 开发环境请求日志（线上构建时通过压缩配置移除 console）
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
      try {
        // 这里直接输出完整 data（包括 authorization），方便你本地排查
        console.log('[EncryptedRequest] POST', urlRoot, data);
      } catch (e) {}
    }

    return fetch(urlRoot, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: cipher
    }).then(function (res) { return res.json(); });
  }

  global.EncryptedRequest = {
    post: post,
    defaults: {
      getBaseUrl: defaultBaseUrl,
      getToken: defaultGetToken,
      getLang: defaultGetLang,
      getAbbr: defaultGetAbbr
    }
  };
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : this);
