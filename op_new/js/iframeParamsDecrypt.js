/**
 * iframe 鏌ヨ鍙傛暟瑙ｅ瘑锛堜笌 lot-h5-new/src/utils/opIframeUrl.js 閰嶅锛?
 * 瑙ｅ瘑 URL 涓殑 ep锛屽苟杩樺師 otk 鈫?token
 */
;(function (global) {
  var VERSION = 1;
  var KEY_SALT = ':op_iframe_v1';
  var EP_PARAM = 'ep';
  var OTK_FIELD = 'otk';
  var OTK_L1_SALT = ':otk_l1';
  var OTK_L2_SALT = ':otk_l2';
  var OTK_EXTRA_SALT = ':otk_x';
  var OTK_MAX_AGE_SEC = 300;

  function deriveKey(host) {
    return CryptoJS.enc.Utf8.parse(md5(String(host || '') + KEY_SALT));
  }

  function deriveIv(nonce) {
    return CryptoJS.enc.Utf8.parse(md5(String(nonce) + ':' + KEY_SALT).substring(0, 16));
  }

  function fromBase64Url(str) {
    var b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return b64;
  }

  function signPayload(params, nonce, ts) {
    return md5(JSON.stringify(params || {}) + '|' + nonce + '|' + ts);
  }

  function zeroIv() {
    return CryptoJS.lib.WordArray.create(Array(16).fill(0), 16);
  }

  function layer1Key(ts, host) {
    return CryptoJS.enc.Utf8.parse(md5(String(ts) + OTK_EXTRA_SALT + String(host || '') + OTK_L1_SALT));
  }

  function layer2Key(ts, host) {
    return CryptoJS.enc.Utf8.parse(md5(String(ts) + OTK_L2_SALT + String(host || '')));
  }

  function deinterleaveTokenTs(packed) {
    var sep1 = packed.indexOf('|');
    if (sep1 < 0) return { token: '', ts: '' };
    var sep2 = packed.indexOf('|', sep1 + 1);
    if (sep2 < 0) return { token: '', ts: '' };

    var tLen = parseInt(packed.slice(0, sep1), 10);
    var sLen = parseInt(packed.slice(sep1 + 1, sep2), 10);
    var body = packed.slice(sep2 + 1);
    if (!tLen || !sLen || isNaN(tLen) || isNaN(sLen)) return { token: '', ts: '' };

    var token = '';
    var ts = '';
    var bi = 0;
    var n = Math.max(tLen, sLen);
    for (var i = 0; i < n; i += 1) {
      if (i < tLen) token += body.charAt(bi++);
      if (i < sLen) ts += body.charAt(bi++);
    }
    return { token: token, ts: ts };
  }

  /** 瑙ｅ瘑涓€娆′娇鐢?key 鈫?鐪熷疄 token */
  function decodeOnceUseKey(otk, host) {
    if (!otk) return '';
    var parts = String(otk).split('.');
    if (parts.length !== 3) return '';

    var ts = parts[0];
    var digest = parts[1];
    var layer2Cipher = fromBase64Url(parts[2]);
    if (!ts || !digest || !layer2Cipher) return '';
    if (md5(layer2Cipher) !== digest) return '';

    var now = Math.floor(Date.now() / 1000);
    var tsNum = parseInt(ts, 10);
    if (!tsNum || Math.abs(now - tsNum) > OTK_MAX_AGE_SEC) return '';

    try {
      var layer1Cipher = CryptoJS.AES.decrypt(layer2Cipher, layer2Key(ts, host), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      }).toString(CryptoJS.enc.Utf8);
      if (!layer1Cipher) return '';

      var packed = CryptoJS.AES.decrypt(layer1Cipher, layer1Key(ts, host), {
        iv: zeroIv(),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString(CryptoJS.enc.Utf8);
      if (!packed) return '';

      return deinterleaveTokenTs(packed).token || '';
    } catch (e) {
      return '';
    }
  }

  /** 瑙ｅ瘑 ep 鏌ヨ鍙傛暟 */
  function decryptEp(ep, host) {
    if (!ep) return null;
    var parts = String(ep).split('.');
    if (parts.length !== 2) return null;

    try {
      var nonce = CryptoJS.enc.Base64.parse(fromBase64Url(parts[0])).toString(CryptoJS.enc.Utf8);
      var cipher = fromBase64Url(parts[1]);
      var decrypted = CryptoJS.AES.decrypt(cipher, deriveKey(host), {
        iv: deriveIv(nonce),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      var jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
      if (!jsonStr) return null;

      var payload = JSON.parse(jsonStr);
      if (!payload || payload.v !== VERSION) return null;
      if (payload.sig !== signPayload(payload.p, payload.n, payload.ts)) return null;
      return payload.p || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 浠庡綋鍓嶉〉闈?URL锛堟垨浼犲叆 search锛夎В瀵?iframe 鍙傛暟
   * @returns {{ lang?, token?, otk?, ... } | null}
   */
  function bootstrap(search, host) {
    try {
      var query = search != null ? search : window.location.search;
      var pageHost = host != null ? host : window.location.host;
      var ep = new URLSearchParams(query).get(EP_PARAM);
      if (!ep) return null;

      var params = decryptEp(ep, pageHost);
      if (!params) return null;

      resolveToken(params, pageHost);
      return params;
    } catch (e) {
      return null;
    }
  }

  /** 浠庡凡瑙ｅ瘑鐨?ep 鍙傛暟涓繕鍘熺湡瀹?token锛坥tk 鈫?token锛?*/
  function resolveToken(params, host) {
    if (!params) return '';
    if (params.token) return String(params.token);
    if (!params[OTK_FIELD]) return '';

    var pageHost = host != null ? host : (typeof window !== 'undefined' ? window.location.host : '');
    var token = decodeOnceUseKey(params[OTK_FIELD], pageHost);
    if (token) params.token = token;
    return token || '';
  }

  /** 瑙ｅ瘑褰撳墠椤?ep 骞惰繑鍥炵湡瀹?token */
  function resolveTokenFromUrl(search, host) {
    var params = bootstrap(search, host);
    if (!params) return '';
    var pageHost = host != null ? host : (typeof window !== 'undefined' ? window.location.host : '');
    return resolveToken(params, pageHost);
  }

  global.OpIframeParamsDecrypt = {
    EP_PARAM: EP_PARAM,
    OTK_FIELD: OTK_FIELD,
    bootstrap: bootstrap,
    decryptEp: decryptEp,
    decodeOnceUseKey: decodeOnceUseKey,
    resolveToken: resolveToken,
    resolveTokenFromUrl: resolveTokenFromUrl,
  };
})(typeof window !== 'undefined' ? window : this);

