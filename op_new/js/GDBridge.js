let _GLJsBridge = window.GLJsBridge ? window.GLJsBridge : {}
const GDBridge =  {
  // 是否嵌套在app中
  isApp() {
    const appIdentification = '/native_com'
    const userAgent = navigator.userAgent.toLowerCase()
    return userAgent.indexOf(appIdentification) !== -1
  },
  /**
   * 所有的第三方页面都要通过jumpWebView或者jumpWebBrows跳转，否则返回按钮失效
   * 打开新的webview与打开新的浏览器的区别？
   * 如果第三方页面有打开手机应用之类的，打开新的浏览器会触发，打开新的webview则不会
   */
  // 打开新的webview
  jumpWebView(url) {
    _GLJsBridge.jumpWebView(url)
  },
  // 打开新的浏览器
  jumpWebBrows(url) {
    _GLJsBridge.jumpWebBrows(url)
  },
  // 关闭app
  finishPage() {
    _GLJsBridge.finishPage()
  },
  /**
   * 唤起对应的app
   * @param {String} uriString 应用地址
   * @param {String} packageName 包名
   * @param {String} noInstallMessage 如果没有对应的app的提示
   */
  messageNow(uriString, packageName, noInstallMessage) {
    _GLJsBridge.messageNow(uriString, packageName, noInstallMessage)
  },
  // 获取app的包名与版本号
  getAppInfo() {
    return JSON.parse(_GLJsBridge.getAppInfo())
  },
  /**
   * @description 复制
   * @param {String} 复制的文案
   */
  copyText(text = '') {
    _GLJsBridge.copyText(text)
  },
  /**
   * @description 分享二维码
   * @param {Object} 分享时后端返回的数据
   */
  shareDynamicPic(data = '') {
    _GLJsBridge.shareDynamicPic(data)
  },
  /**
   * @description 路由
   * @param {String} 类型
   * @param {String} 目标
   */
  // type值
  //  0：打开系统浏览器
  //  1：充值
  //  2：打开webView
  //  3：提现
  //  4：跳首页下注
  //  5：弹出图片
  routeAllJumper(type, resTarget = '') {
    const errMsg = 'Params error'
    if ((type === '0' || type === '2') && resTarget === '') {
      toast(errMsg)
      return
    } else if (type === '5' && !resTarget.startsWith('http')) {
      toast(errMsg)
      return
    }
    _GLJsBridge.routeAllJumper(type, resTarget)
  },
  // 获取app的token
  getToken() {
    return _GLJsBridge.getToken()
  },
  // 获取app的公共参数
  getCommonParam() {
    let params = _GLJsBridge.getCommonParam ? _GLJsBridge.getCommonParam() : '{}'

    return JSON.parse(params)
  },
  setToolbarVisibility(val) {
    // 0显示 1隐藏
    _GLJsBridge.setToolbarVisibility(val + '')
  },
  jumpDeposit(val = '') {
    _GLJsBridge.jumpDeposit(val)
  },
  /**
   *
   * @param {String} val 传递1 代表从代理的金额提的 不传递，就是正常提现
   */
  jumpWithDrawable(val = '') {
    _GLJsBridge.jumpWithDrawable(val + '')
  },
  // 关闭页面
  closePage() {
    _GLJsBridge.closePage()
  },
  // 获取app语言
  getLanguage() {
    var appLanguage = null
    try {
      appLanguage = _GLJsBridge.getLanguage()
    } catch (error) {
      appLanguage = 'en'
    }
    switch (appLanguage) {
      case 'en':
        return 'en'

      case 'hi':
        return 'hi'

      case 'bi':
        return 'bi'

      case 'pt':
        return 'pt'

      case 'ar':
        return 'ar'

      default:
        return 'en'
    }
  },
  getBaseUrl(){
    const js_bs_info = _GLJsBridge.getBaseConfigInfo ? _GLJsBridge.getBaseConfigInfo() : '{}'
    const base_info = JSON.parse(js_bs_info)
    let baseUrl = base_info.baseUrl || undefined;
    return baseUrl
  },

  // 跳转登录
  jumpLogin(){
    _GLJsBridge.startLogin()
  },
  // 调用方法
  loadJsFun(fun){
    _GLJsBridge.loadJsFun(fun)
  },
  // 日志
  postDebugInfo(data1,data2,data3){
    _GLJsBridge.postDebugInfo(data1,data2,data3)
  },
  // 获取页面状态
  getPageStatus(){
    return _GLJsBridge.getPageStatus()
  },
  // 获取颜色配置
  getAppThemeColor(){
    return _GLJsBridge.getAppThemeColor()
  },
  getAppTheme(){
    return _GLJsBridge.getAppTheme()
  },
} 