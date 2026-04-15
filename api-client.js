/**
 * EventHub API Client
 * Comprehensive frontend API wrapper for all backend routes
 * BASE URL: http://localhost:8000/api/v1
 */

(function () {
  var REMOTE_API_ROOT = 'https://eduhub-backend-eight.vercel.app/api/v1';
  var LOCAL_API_ROOT = 'http://localhost:8000/api/v1';

  function resolveApiRoot() {
    if (window.EVENTHUB_API_ROOT) {
      return String(window.EVENTHUB_API_ROOT).replace(/\/$/, '');
    }

    var host = window.location && window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return LOCAL_API_ROOT;
    }

    return REMOTE_API_ROOT;
  }

  var API_ROOT = resolveApiRoot();
  console.log('[EventHubAPI] Initialized with API_ROOT:', API_ROOT);

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

    console.debug('[EventHubAPI] response headers', {
      note: 'Set-Cookie is an HttpOnly forbidden response header',
      headers: hints
    });
  }

  function request(path, options) {
    var url = buildUrl(path);
    var fetchOptions = toFetchOptions(options);

    console.log('[EventHubAPI] Making request to:', url, 'with options:', fetchOptions);

    return fetch(url, fetchOptions)
      .then(function (response) {
        console.log('[EventHubAPI] Response received:', {
          url: url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          type: response.type
        });
        logResponseHeaders(response);
        return response;
      })
      .catch(function (error) {
        console.error('[EventHubAPI] Fetch error:', error.message);
        throw error;
      });
  }

  function parseJsonSafe(response) {
    return response.json().catch(function () {
      return null;
    });
  }

  // ===============================================
  // AUTHENTICATION ROUTES (/auth)
  // ===============================================

  function auth_login(payload) {
    return request('/auth/login', { method: 'POST', json: payload });
  }

  function auth_signup(payload) {
    // Supports both /signup and /register endpoints
    return request('/auth/signup', { method: 'POST', json: payload });
  }

  function auth_register(payload) {
    // Alias for signup - follows API_ROUTES_NEEDED.txt
    return request('/auth/register', { method: 'POST', json: payload });
  }

  function auth_me() {
    return request('/auth/me', { method: 'GET' });
  }

  function auth_logout() {
    return request('/auth/logout', { method: 'POST' });
  }

  function auth_refresh(payload) {
    return request('/auth/refresh', { method: 'POST', json: payload || {} });
  }

  function auth_sendSignupOtp(payload) {
    return request('/auth/send-otp/signup', { method: 'POST', json: payload });
  }

  function auth_verifyOtp(payload) {
    return request('/auth/verify-otp', { method: 'POST', json: payload });
  }

  // ===============================================
  // EVENT ROUTES (/events)
  // ===============================================

  function events_create(payload) {
    return request('/events', { method: 'POST', json: payload });
  }

  function events_getAll(queryParams) {
    var url = '/events';
    if (queryParams) {
      var params = new URLSearchParams(queryParams);
      url = url + '?' + params.toString();
    }
    return request(url, { method: 'GET' });
  }

  function events_getById(eventId) {
    return request('/events/' + eventId, { method: 'GET' });
  }

  function events_update(eventId, payload) {
    return request('/events/' + eventId, { method: 'PUT', json: payload });
  }

  function events_delete(eventId) {
    return request('/events/' + eventId, { method: 'DELETE' });
  }

  function events_updateRules(eventId, payload) {
    return request('/events/' + eventId + '/rules', { method: 'PUT', json: payload });
  }

  function events_updateInfo(eventId, payload) {
    return request('/events/' + eventId + '/info', { method: 'PUT', json: payload });
  }

  // ===============================================
  // SCHEDULE ROUTES (/schedule)
  // ===============================================

  function schedule_create(eventId, payload) {
    return request('/schedule/' + eventId, { method: 'POST', json: payload });
  }

  function schedule_getAll(eventId) {
    return request('/schedule/' + eventId, { method: 'GET' });
  }

  function schedule_update(eventId, slotId, payload) {
    return request('/schedule/' + eventId + '/' + slotId, { method: 'PUT', json: payload });
  }

  function schedule_delete(eventId, slotId) {
    return request('/schedule/' + eventId + '/' + slotId, { method: 'DELETE' });
  }

  // ===============================================
  // TEAMS/REGISTRATIONS ROUTES (/teams, /registrations)
  // ===============================================

  function teams_register(payload) {
    return request('/teams/register', { method: 'POST', json: payload });
  }

  function teams_getUserRegistrations() {
    return request('/teams/registrations/mine', { method: 'GET' });
  }

  function teams_getEventTeams(eventId) {
    return request('/teams/' + eventId + '/teams', { method: 'GET' });
  }

  function teams_approveRegistration(registrationId, payload) {
    return request('/teams/registrations/' + registrationId + '/approve', {
      method: 'PUT',
      json: payload || {}
    });
  }

  function teams_rejectRegistration(registrationId, payload) {
    return request('/teams/registrations/' + registrationId + '/reject', {
      method: 'PUT',
      json: payload || {}
    });
  }

  function teams_cancelRegistration(teamId) {
    return request('/teams/' + teamId, { method: 'DELETE' });
  }

  // ===============================================
  // REGISTRATIONS ROUTES (/teams/registrations) - BACKEND ALIGNED
  // ===============================================

  function registrations_getByEventId(eventId, queryParams) {
    var url = '/teams/registrations/' + eventId;
    if (queryParams) {
      var params = new URLSearchParams(queryParams);
      url = url + '?' + params.toString();
    }
    return request(url, { method: 'GET' });
  }

  function registrations_updatePayment(registrationId, payload) {
    return request('/teams/registrations/' + registrationId + '/payment', {
      method: 'PUT',
      json: payload
    });
  }

  function registrations_approve(registrationId, payload) {
    return request('/teams/registrations/' + registrationId + '/approve', {
      method: 'PUT',
      json: payload || {}
    });
  }

  function registrations_reject(registrationId, payload) {
    return request('/teams/registrations/' + registrationId + '/reject', {
      method: 'PUT',
      json: payload || {}
    });
  }

  // ===============================================
  // USER ROUTES (/user)
  // ===============================================

  function user_getProfile() {
    return request('/user/me', { method: 'GET' });
  }

  function user_update(payload) {
    return request('/user/updateme', { method: 'PUT', json: payload });
  }

  function user_updatePassword(payload) {
    return request('/user/updatepassword', { method: 'PUT', json: payload });
  }

  // ===============================================
  // EXPOSE API - organized by module
  // ===============================================

  window.EventHubAPI = {
    // Core
    root: API_ROOT,
    request: request,
    parseJsonSafe: parseJsonSafe,

    // Auth
    Auth: {
      login: auth_login,
      signup: auth_signup,
      register: auth_register,
      me: auth_me,
      logout: auth_logout,
      refresh: auth_refresh,
      sendSignupOtp: auth_sendSignupOtp,
      verifyOtp: auth_verifyOtp
    },

    // Events
    Events: {
      create: events_create,
      getAll: events_getAll,
      getById: events_getById,
      update: events_update,
      delete: events_delete,
      updateRules: events_updateRules,
      updateInfo: events_updateInfo
    },

    // Schedule
    Schedule: {
      create: schedule_create,
      getAll: schedule_getAll,
      update: schedule_update,
      delete: schedule_delete
    },

    // Teams (backward compatibility)
    Teams: {
      register: teams_register,
      getUserRegistrations: teams_getUserRegistrations,
      getEventTeams: teams_getEventTeams,
      approveRegistration: teams_approveRegistration,
      rejectRegistration: teams_rejectRegistration,
      cancelRegistration: teams_cancelRegistration
    },

    // Registrations (corrected paths)
    Registrations: {
      getByEventId: registrations_getByEventId,
      updatePayment: registrations_updatePayment,
      approve: registrations_approve,
      reject: registrations_reject
    },

    // User
    User: {
      getProfile: user_getProfile,
      update: user_update,
      updatePassword: user_updatePassword
    },

    // Backward compatibility aliases for old auth-client.js usage
    login: auth_login,
    signup: auth_signup,
    me: auth_me,
    logout: auth_logout,
    refresh: auth_refresh,
    verifyOtp: auth_verifyOtp,
    sendSignupOtp: auth_sendSignupOtp
  };

  // Also maintain old AuthAPI for backward compatibility
  window.AuthAPI = window.EventHubAPI;
})();
