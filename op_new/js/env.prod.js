;(function (win) {
  // 线上环境（正式）配置
  var cfg = {
    base_url: 'https://ieg.yano777.com',
    base_url_two: 'https://ieg.yano777.com/',
    chat_base_url: 'wss://wsseg.yano777.com',
    upload_base_url: 'https://upeg.yano777.com'
  };

  win.envConfig = cfg;
  win.base_url = cfg.base_url;
  win.base_url_two = cfg.base_url_two;
  win.chat_base_url = cfg.chat_base_url;
  win.upload_base_url = cfg.upload_base_url;
})(window);

