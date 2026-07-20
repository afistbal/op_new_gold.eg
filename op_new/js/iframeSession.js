/**
 * iframe 鍐?token/lang 缁熶竴澶勭悊锛坋p/otk 瑙ｅ瘑 + localStorage锛屼笌 token1 鍒嗘敮瀵归綈锛?
 * 渚濊禆锛歩frameParamsDecrypt.js锛堝彲閫夛紝鏈?ep 鏃惰В瀵?otk锛?
 */
;(function (global) {
  'use strict';

  var __opIframeParams = null;

  function syncIframeParams() {
    if (__opIframeParams) return __opIframeParams;
    if (global.OpIframeParamsDecrypt && typeof global.OpIframeParamsDecrypt.bootstrap === 'function') {
      __opIframeParams = global.OpIframeParamsDecrypt.bootstrap() || null;
      global.__opIframeParams = __opIframeParams;
    }
    return __opIframeParams;
  }

  function decryptIframeToken() {
    if (!global.OpIframeParamsDecrypt) return '';
    var host = global.location && global.location.host ? global.location.host : '';
    var params = syncIframeParams();
    if (params) {
      return global.OpIframeParamsDecrypt.resolveToken(params, host) || '';
    }
    return global.OpIframeParamsDecrypt.resolveTokenFromUrl() || '';
  }

  function getBridgeToken() {
    if (global.GLJsBridge && typeof global.GLJsBridge.getToken === 'function') {
      try {
        var t = global.GLJsBridge.getToken();
        if (t && t !== 'x') return String(t);
      } catch (e) {}
    }
    return '';
  }

  function getStoredToken() {
    try {
      return global.localStorage.getItem('op_token') || '';
    } catch (e) {
      return '';
    }
  }

  function getUrlPlainToken() {
    try {
      return new URLSearchParams(global.location.search).get('token') || '';
    } catch (e) {
      return '';
    }
  }

  function getToken() {
    return getBridgeToken() || decryptIframeToken() || getStoredToken() || getUrlPlainToken() || '';
  }

  function getUrlParam(name) {
    if (name === 'token') return '';
    var params = syncIframeParams();
    if (params && params[name] != null && params[name] !== '') {
      return String(params[name]);
    }
    try {
      return new URLSearchParams(global.location.search).get(name) || '';
    } catch (e) {
      return '';
    }
  }

  function getLang() {
    if (global.GLJsBridge && typeof global.GLJsBridge.getLanguage === 'function') {
      try {
        var appLang = global.GLJsBridge.getLanguage();
        if (appLang && appLang !== 'x') {
          var bridgeLang = (appLang || 'en').toLowerCase().split('-')[0];
          if (['en', 'hi', 'ar'].indexOf(bridgeLang) !== -1) return bridgeLang;
        }
      } catch (e) {}
    }
    var urlLang = getUrlParam('lang');
    if (urlLang) {
      var lang = urlLang.toLowerCase();
      if (['en', 'hi', 'ar'].indexOf(lang) !== -1) return lang;
    }
    try {
      var stored = global.localStorage.getItem('op_lang');
      if (stored) return stored;
    } catch (e) {}
    return 'en';
  }

  function saveTokenAndLang() {
    var token = decryptIframeToken() || getUrlPlainToken() || getBridgeToken();
    var lang = getLang();
    try {
      if (token) global.localStorage.setItem('op_token', token);
      if (lang) global.localStorage.setItem('op_lang', lang);
    } catch (e) {}
  }

  /** 鍏煎 token1锛歎RL 鏄庢枃 token 鍐欏叆 localStorage 骞舵竻鐞嗗湴鍧€鏍?*/
  function bootstrapUrlToken() {
    try {
      var params = new URLSearchParams(global.location.search);
      var urlToken = params.get('token') || '';
      if (urlToken) global.localStorage.setItem('op_token', urlToken);
      if (params.has('token')) {
        params.delete('token');
        var q = params.toString();
        global.history.replaceState(
          null,
          '',
          global.location.pathname + (q ? '?' + q : '') + global.location.hash
        );
      }
    } catch (e) {}
  }

  function appendLangQuery(path) {
    var lang = getLang();
    if (!lang) return path;
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return path + sep + 'lang=' + encodeURIComponent(lang);
  }

  global.IframeSession = {
    syncIframeParams: syncIframeParams,
    decryptIframeToken: decryptIframeToken,
    getToken: getToken,
    getLang: getLang,
    getUrlParam: getUrlParam,
    saveTokenAndLang: saveTokenAndLang,
    bootstrapUrlToken: bootstrapUrlToken,
    appendLangQuery: appendLangQuery,
  };
})(typeof window !== 'undefined' ? window : this);

