// ==UserScript==
// @name         sora delete patcher
// @namespace    https://github.com/gurumnyang/
// @version      0.1.1
// @description  소라 삭제 버그를 해결해주는 프로그램. solve sora delete method issue
// @match        https://sora.chatgpt.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @updateURL   https://raw.githubusercontent.com/gurumnyang/sora-delete-patcher-userscript/main/sora-delete-patcher.user.js
// @downloadURL https://raw.githubusercontent.com/gurumnyang/sora-delete-patcher-userscript/main/sora-delete-patcher.user.js
// ==/UserScript==

/*
 /$$$$$$$   /$$$$$$  /$$$$$$ /$$   /$$  /$$$$$$  /$$$$$$ /$$$$$$$  /$$$$$$$$
| $$__  $$ /$$__  $$|_  $$_/| $$$ | $$ /$$__  $$|_  $$_/| $$__  $$| $$_____/
| $$  \ $$| $$  \__/  | $$  | $$$$| $$| $$  \__/  | $$  | $$  \ $$| $$
| $$  | $$| $$        | $$  | $$ $$ $$|  $$$$$$   | $$  | $$  | $$| $$$$$
| $$  | $$| $$        | $$  | $$  $$$$ \____  $$  | $$  | $$  | $$| $$__/
| $$  | $$| $$    $$  | $$  | $$\  $$$ /$$  \ $$  | $$  | $$  | $$| $$
| $$$$$$$/|  $$$$$$/ /$$$$$$| $$ \  $$|  $$$$$$/ /$$$$$$| $$$$$$$/| $$$$$$$$
|_______/  \______/ |______/|__/  \__/ \______/ |______/|_______/ |________/



  /$$$$$$  /$$   /$$ /$$$$$$$  /$$   /$$ /$$      /$$      /$$$$$$$$ /$$$$$$   /$$$$$$  /$$
 /$$__  $$| $$  | $$| $$__  $$| $$  | $$| $$$    /$$$     |__  $$__//$$__  $$ /$$__  $$| $$
| $$  \__/| $$  | $$| $$  \ $$| $$  | $$| $$$$  /$$$$        | $$  | $$  \ $$| $$  \ $$| $$
| $$ /$$$$| $$  | $$| $$$$$$$/| $$  | $$| $$ $$/$$ $$ /$$$$$$| $$  | $$  | $$| $$  | $$| $$
| $$|_  $$| $$  | $$| $$__  $$| $$  | $$| $$  $$$| $$|______/| $$  | $$  | $$| $$  | $$| $$
| $$  \ $$| $$  | $$| $$  \ $$| $$  | $$| $$\  $ | $$        | $$  | $$  | $$| $$  | $$| $$
|  $$$$$$/|  $$$$$$/| $$  | $$|  $$$$$$/| $$ \/  | $$        | $$  |  $$$$$$/|  $$$$$$/| $$$$$$$$
 \______/  \______/ |__/  |__/ \______/ |__/     |__/        |__/   \______/  \______/ |________/

 */


(function inject() {
  const script = document.createElement('script');
  script.textContent = '(' + function () {
    'use strict';

    // 대상 URL: https://sora.chatgpt.com/backend/generations/gen_<id>
    const TARGET_RE = /^https:\/\/sora\.chatgpt\.com\/backend\/generations\/gen_[A-Za-z0-9]+$/;

    const originalFetch = window.fetch;

    function getAbsoluteUrl(input) {
      try {
        if (input instanceof Request) return input.url;
        if (input instanceof URL) return input.href;
        return new URL(String(input), location.href).href;
      } catch (_) {
        return String(input);
      }
    }

    function mergeHeaders(base, extra) {
      const h = new Headers(base || undefined);
      if (extra) {
        new Headers(extra).forEach((v, k) => h.set(k, v));
      }
      return h;
    }

    window.fetch = function patchedFetch(input, init) {
      try {
        const absUrl = getAbsoluteUrl(input);

        let currentMethod = 'POST';
        if (init && init.method) currentMethod = String(init.method);
        else if (input instanceof Request && input.method) currentMethod = String(input.method);

        const methodUpper = currentMethod.toUpperCase();

        if (TARGET_RE.test(absUrl) && methodUpper === 'POST') {
          const initObj = Object.assign({}, init || {});
          const rawBody = initObj.body
          let parsed = rawBody;
          if (typeof rawBody === 'string') parsed = JSON.parse(rawBody);
          if (parsed && parsed.is_archived === false) return originalFetch.apply(this, arguments);

          if ('body' in initObj) delete initObj.body;

          const mergedHeaders = mergeHeaders(
            input instanceof Request ? input.headers : undefined,
            initObj.headers
          );
          mergedHeaders.delete('content-type');
          initObj.headers = mergedHeaders;

          initObj.method = 'DELETE';

          if (input instanceof Request) {
            const req = new Request(absUrl, {
              method: 'DELETE',
              headers: initObj.headers,
              signal: initObj.signal || input.signal,
              credentials: initObj.credentials || input.credentials,
              mode: initObj.mode || input.mode,
              cache: initObj.cache || input.cache,
              redirect: initObj.redirect || input.redirect,
              referrer: initObj.referrer || input.referrer,
              referrerPolicy: initObj.referrerPolicy || input.referrerPolicy,
              integrity: initObj.integrity || input.integrity,
              keepalive: initObj.keepalive || input.keepalive
            });
            return originalFetch.call(this, req);
          } else {
            return originalFetch.call(this, absUrl, initObj);
          }
        }

        return originalFetch.apply(this, arguments);
      } catch (e) {
        console.warn('[DELETE patcher] fetch hook error:', e);
        return originalFetch.apply(this, arguments);
      }
    };

    try { console.debug('[DELETE patcher] 설치 완료!'); } catch (_) {}
  } + ')();';

  document.documentElement.appendChild(script);
  script.remove();
})();
