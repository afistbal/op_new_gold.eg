;(function () {
  function getUrlParam(key) {
    try {
      var params = new URLSearchParams(window.location.search || '')
      return params.get(key)
    } catch (e) {
      return null
    }
  }

  function normalizeLang(code) {
    if (!code) return ''
    code = String(code).trim().toLowerCase()
    var i = code.indexOf('-')
    if (i > -1) {
      code = code.slice(0, i)
    }
    return code
  }

  // 统一的语言检测：优先原生 -> URL ?lang= -> 默认 ar（EG）
  // 并把 eg 归一为 ar，用于镜像和阿语文案
  function detectLang() {
    var appLanguage = null
    try {
      if (window.GLJsBridge && typeof window.GLJsBridge.getLanguage === 'function') {
        appLanguage = window.GLJsBridge.getLanguage()
      }
    } catch (e) {
      // ignore
    }

    if (!appLanguage) {
      var lang = getUrlParam('lang')
      appLanguage = lang ? lang : 'ar'
    }

    appLanguage = normalizeLang(appLanguage)

    switch (appLanguage) {
      case 'ar':
      case 'eg':
        return 'ar'
      case 'hi':
        return 'hi'
      case 'en':
      default:
        return 'en'
    }
  }

  // 应用 dir 与镜像样式，返回最终 langCode
  function applyMirror() {
    var langCode = detectLang()
    var html = document.documentElement || document.querySelector('html')

    if (html) {
      html.setAttribute('lang', langCode)
      if (langCode === 'ar') {
        html.setAttribute('dir', 'rtl')
      } else {
        html.setAttribute('dir', 'ltr')
      }
    }

    if (typeof document !== 'undefined' && document.body) {
      if (langCode === 'ar') {
        document.body.classList.add('mirror-mode')
      } else {
        document.body.classList.remove('mirror-mode')
      }
    }

    return langCode
  }

  // 暴露到全局，方便页面按需再用 langCode 做文案切换
  window.EGMirror = {
    detectLang: detectLang,
    applyMirror: applyMirror,
  }

  // 默认在 DOM 准备好后自动应用一次
  if (document && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyMirror)
  } else {
    try {
      applyMirror()
    } catch (e) {
      // ignore
    }
  }
})()

