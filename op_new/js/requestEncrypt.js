;(function (global) {
    /**
     * 通用请求体加密工具
     * 依赖：
     *  - 全局 CryptoJS（crypto-js）
     *  - 全局 md5（js-md5）
     *
     * 加密协议：
     *  - key = md5(host)
     *  - 算法 = AES-256-CBC
     *  - IV = 16 个 0 字节
     *  - padding = PKCS7
     *  - 输出 = Base64 字符串（给后端 base64_decode 使用）
     */
  
    function encryptBody(data, host) {
      var h = host || (typeof window !== "undefined" ? window.location.host : "");
      var keyStr = md5(h); // js-md5 全局方法
      var key = CryptoJS.enc.Utf8.parse(keyStr);
  
      // 16 字节全 0 IV
      var iv = CryptoJS.lib.WordArray.create(Array(16).fill(0), 16);
  
      var jsonStr = typeof data === "string" ? data : JSON.stringify(data);
  
      var encrypted = CryptoJS.AES.encrypt(jsonStr, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
  
      return encrypted.toString(); // Base64
    }
  
    // 暴露统一命名空间
    global.RequestEncrypt = {
      encryptBody: encryptBody,
    };
  })(this);
  
  