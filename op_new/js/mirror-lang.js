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

  // 统一的语言检测：优先原生 -> URL ?lang= -> 默认 ar
  // 并把 eg 归一为 ar；只有明确传了 en 时才用英文（不镜像）
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
      // 没有任何来源的语言时，默认阿语（走镜像）
      appLanguage = lang || 'ar'
    }

    appLanguage = normalizeLang(appLanguage)

    switch (appLanguage) {
      case 'en':
        // 只有明确传了英文，才用英文（关闭镜像）
        return 'en'
      case 'ar':
      case 'eg':
      default:
        // 其余全部按阿语处理（含 hi/zh 等），都走镜像
        return 'ar'
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

