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

  // 统一语言检测（与 self-service 等页一致）：App > URL ?lang= > localStorage op_lang > 默认 ar
  // 有 App 或 URL 时回写 localStorage，保证各页打开时“一个语言就足够”
  function detectLang() {
    var resolved = null
    var source = null

    try {
      if (window.GLJsBridge && typeof window.GLJsBridge.getLanguage === 'function') {
        var appLang = window.GLJsBridge.getLanguage()
        if (appLang && String(appLang).trim() && String(appLang).toLowerCase() !== 'x') {
          resolved = normalizeLang(appLang)
          source = 'app'
        }
      }
    } catch (e) { /* ignore */ }

    if (!resolved) {
      var urlLang = getUrlParam('lang')
      if (urlLang) {
        resolved = normalizeLang(urlLang)
        source = 'url'
      }
    }

    if (!resolved) {
      try {
        var stored = localStorage.getItem('op_lang')
        if (stored) resolved = normalizeLang(stored)
      } catch (e) { /* ignore */ }
    }

    if (!resolved) resolved = 'ar'

    // 全局语言策略：只有 en 用英文，其它（hi/eg/…）全部按 ar 处理
    resolved = resolved === 'en' ? 'en' : 'ar'

    if (source === 'app' || source === 'url') {
      try {
        localStorage.setItem('op_lang', resolved)
      } catch (e) { /* ignore */ }
    }

    return resolved
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

