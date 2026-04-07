(function () {
  var API_ROOT = 'https://eduhub-backend-eight.vercel.app/api/v1';

  function buildUrl(path) {
    if (!path) return API_ROOT;
    if (/^https?:\/\//i.test(path)) return path;
    return API_ROOT + (path[0] === '/' ? path : '/' + path);
  }

  function toFetchOptions(options) {
    var next = Object.assign({}, options || {});
    var method = (next.method || 'GET').toUpperCase();
    var headers = Object.assign({}, next.headers || {});

    if (next.json !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      next.body = JSON.stringify(next.json);
      delete next.json;
    }

    next.method = method;
    next.headers = headers;
    next.credentials = 'include';
    return next;
  }

  function logResponseHeaders(response) {
    var hints = {
      accessControlAllowOrigin: response.headers.get('access-control-allow-origin'),
      accessControlAllowCredentials: response.headers.get('access-control-allow-credentials'),
      setCookieReadableInJs: response.headers.get('set-cookie')
    };

    console.debug('[AuthDebug] response headers visibility note', {
      note: 'Set-Cookie is an HttpOnly forbidden response header and is expected to be null in JS.',
      headers: hints
    });
  }

  function request(path, options) {
    var url = buildUrl(path);
    var fetchOptions = toFetchOptions(options);

    console.debug('[AuthDebug] request', {
      url: url,
      method: fetchOptions.method,
      credentials: fetchOptions.credentials
    });

    return fetch(url, fetchOptions).then(function (response) {
      console.debug('[AuthDebug] response', {
        url: url,
        status: response.status,
        ok: response.ok,
        redirected: response.redirected,
        type: response.type
      });
      logResponseHeaders(response);
      return response;
    });
  }

  function parseJsonSafe(response) {
    return response
      .json()
      .catch(function () {
        return null;
      });
  }

  function me() {
    return request('/auth/me', { method: 'GET' });
  }

  function login(payload) {
    return request('/auth/login', { method: 'POST', json: payload });
  }

  function signup(payload) {
    return request('/auth/signup', { method: 'POST', json: payload });
  }

  function refresh(payload) {
    return request('/auth/refresh', { method: 'POST', json: payload || {} });
  }

  function logout() {
    return request('/auth/logout', { method: 'POST' });
  }

  function verifyOtp(payload) {
    return request('/auth/verify-otp', { method: 'POST', json: payload });
  }

  function sendSignupOtp(payload) {
    return request('/auth/send-otp/signup', { method: 'POST', json: payload });
  }

  window.AuthAPI = {
    root: API_ROOT,
    request: request,
    parseJsonSafe: parseJsonSafe,
    me: me,
    login: login,
    signup: signup,
    refresh: refresh,
    logout: logout,
    verifyOtp: verifyOtp,
    sendSignupOtp: sendSignupOtp
  };
})();
