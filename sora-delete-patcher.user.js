// ==UserScript==
// @name         sora delete patcher
// @namespace    https://github.com/gurumnyang/
// @version      0.1.4
// @description  소라 삭제 버그를 해결해주는 프로그램. solve sora delete method issue
// @match        https://sora.chatgpt.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @updateURL    https://raw.githubusercontent.com/gurumnyang/sora-delete-patcher-userscript/main/sora-delete-patcher.user.js
// @downloadURL  https://raw.githubusercontent.com/gurumnyang/sora-delete-patcher-userscript/main/sora-delete-patcher.user.js
// ==/UserScript==

(function injectWithNonce() {
  'use strict';

  //nonce찾아서 CSP정책을 우회해봐요! 히힛
  function findNonce() {
    //<script nonce>
    const s = document.querySelector('script[nonce]');
    if (s) return s.nonce || s.getAttribute('nonce') || null;

    //혹??시 meta에 박혀있을수도
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (meta) {
      const content = meta.getAttribute('content') || '';
      const m = content.match(/'nonce-([^']+)'/);
      if (m) return m[1];
    }
    return null;
  }

  function doInject(nonce) {
    try {
      const script = document.createElement('script');
      if (nonce) script.setAttribute('nonce', nonce);

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
          if (extra) new Headers(extra).forEach((v, k) => h.set(k, v));
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
              const rawBody = initObj.body;
              let parsed = rawBody;

              if (typeof rawBody === 'string') {
                try { parsed = JSON.parse(rawBody); } catch (_) {}
              }

              if (!parsed || parsed.is_archived !== true) {
                return originalFetch.apply(this, arguments);
              }

              // POST {is_archived:true} → DELETE로 변환
              if ('body' in initObj) delete initObj.body;

              const mergedHeaders = mergeHeaders(
                input instanceof Request ? input.headers : undefined,
                initObj.headers
              );
              mergedHeaders.delete('content-type'); // DELETE에는 굳이 필요 없음
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
            try { console.warn('[DELETE patcher] fetch hook error:', e); } catch (_) {}
            return window.fetch.apply(this, arguments);
          }
        };

        try { console.debug('[DELETE patcher] 설치 완료!'); } catch (_) {}
      } + ')();';

      document.documentElement.appendChild(script);
      script.remove();
    } catch (e) {
      try { console.error('[DELETE patcher] injection failed:', e); } catch (_) {}
    }
  }

  // 즉시 시도
  const nowNonce = findNonce();
  if (nowNonce) {
    doInject(nowNonce);
    return;
  }

  // 초기 파싱 타이밍에 nonce가 아직 없을 수 있으니 잠깐 관찰
  const obs = new MutationObserver(() => {
    const n = findNonce();
    if (n) {
      obs.disconnect();
      doInject(n);
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
