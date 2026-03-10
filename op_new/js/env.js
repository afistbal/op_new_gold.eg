;(function (win) {
  // 统一域名配置
  var cfg = {
    // 埃及 Vue 同源：ieg / upeg
    base_url: 'https://ieg.yano777.com',
    base_url_two: 'https://ieg.yano777.com/',
    chat_base_url: 'wss://wsseg.yano777.com',
    upload_base_url: 'https://upeg.yano777.com'
  };

  // 暴露全局对象，方便 JS 里访问
  win.envConfig = cfg;

  // 同时兼容老的全局变量名
  win.base_url = cfg.base_url;
  win.base_url_two = cfg.base_url_two;
  win.chat_base_url = cfg.chat_base_url;
  win.upload_base_url = cfg.upload_base_url;
})(window);

