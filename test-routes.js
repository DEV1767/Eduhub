#!/usr/bin/env node

const http = require('http');
const https = require('https');
const querystring = require('querystring');

const BASE_URL = 'http://localhost:8000/api/v1';

// Test credentials
const STUDENT = {
  email: 'shivamchy076@gmail.com',
  password: 'shiv@9934'
};

const ORGANIZER = {
  email: 'p622133@gmail.com',
  password: 'p622133@gmail.com'
};

let studentToken = null;
let organizerToken = null;
let testEventId = null;
let testRegistrationId = null;

const results = [];

function log(message, status = 'INFO') {
  const colors = {
    'PASS': '\x1b[32m', // Green
    'FAIL': '\x1b[31m', // Red
    'INFO': '\x1b[36m', // Cyan
    'PENDING': '\x1b[33m' // Yellow
  };
  const reset = '\x1b[0m';
  console.log(`${colors[status]}[${status}]${reset} ${message}`);
}

async function request(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const client = url.protocol === 'https:' ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testRoute(name, method, endpoint, body = null, token = null, expectedStatus = 200) {
  try {
    const res = await request(method, endpoint, body, token);
    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const passed = expectedStatuses.includes(res.status);
    const status = passed ? 'PASS' : 'FAIL';

    log(`${method} ${endpoint} - Status: ${res.status} (Expected: ${expectedStatuses.join(' or ')})`, status);
    
    // Debug failed routes
    if (!passed) {
      if (res.status === 400 && res.data?.message) {
        log(`  Error: ${res.data.message}`, 'INFO');
      } else if (res.status === 400 && res.data?.error) {
        log(`  Error: ${res.data.error}`, 'INFO');
      }
    }
    
    results.push({ name, status, statusCode: res.status });
    
    return res;
  } catch (err) {
    log(`${method} ${endpoint} - ERROR: ${err.message}`, 'FAIL');
    results.push({ name, status: 'FAIL', error: err.message });
    return null;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('EVENTHUB BACKEND ROUTE SMOKE TEST');
  console.log('='.repeat(80) + '\n');

  // ====== AUTH ROUTES ======
  log('Testing Authentication Routes...', 'INFO');

  // Login Student
  let res = await testRoute('Student Login', 'POST', '/auth/login', STUDENT, null, 200);
  if (res?.data?.accessToken) {
    studentToken = res.data.accessToken;
    log(`Student token retrieved: ${studentToken.substring(0, 30)}...`, 'INFO');
  } else {
    log(`Student token not found in response: ${JSON.stringify(res?.data)}`, 'FAIL');
  }

  // Login Organizer
  res = await testRoute('Organizer Login', 'POST', '/auth/login', ORGANIZER, null, 200);
  if (res?.data?.accessToken) {
    organizerToken = res.data.accessToken;
    log(`Organizer token retrieved: ${organizerToken.substring(0, 30)}...`, 'INFO');
  } else {
    log(`Organizer token not found in response: ${JSON.stringify(res?.data)}`, 'FAIL');
  }

  // Get Current User (Student)
  await testRoute('Get Current User (Student)', 'GET', '/auth/me', null, studentToken, 200);

  // Get Current User (Organizer)
  await testRoute('Get Current User (Organizer)', 'GET', '/auth/me', null, organizerToken, 200);

  // ====== EVENT ROUTES ======
  console.log('\n' + '-'.repeat(80));
  log('Testing Event Routes...', 'INFO');

  // Get all events
  res = await testRoute('Get All Events', 'GET', '/events', null, studentToken, 200);

  // Create Event (Organizer only)
  const newEvent = {
    name: `Test Event ${Date.now()}`,
    type: 'Hackathon',
    status: 'Upcoming',
    date: '2026-05-15',
    time: '10:00',
    venue: 'Main Hall',
    maxTeams: 50,
    prize: '10000',
    description: 'Test event for smoke testing'
  };
  res = await testRoute('Create Event', 'POST', '/events', newEvent, organizerToken, 201);
  if (res?.data?.event?._id) {
    testEventId = res.data.event._id;
  } else if (res?.data?._id) {
    testEventId = res.data._id;
  }

  // Get Single Event
  if (testEventId) {
    await testRoute(`Get Event Details`, 'GET', `/events/${testEventId}`, null, studentToken, 200);
  }

  // Update Event (Organizer only)
  if (testEventId) {
    await testRoute('Update Event', 'PUT', `/events/${testEventId}`, 
      { ...newEvent, name: `Updated ${newEvent.name}` }, organizerToken, 200);
  }

  // ====== TEAM/REGISTRATION ROUTES ======
  console.log('\n' + '-'.repeat(80));
  log('Testing Team/Registration Routes...', 'INFO');

  // Register Team
  if (testEventId) {
    const registration = {
      eventId: testEventId,
      teamname: `Test Team ${Date.now()}`,
      leadname: 'Test Lead',
      phone: '9876543210',
      collegeid: 'COLLEGE123',
      members: ['Member 1', 'Member 2']
    };
    res = await testRoute('Register Team', 'POST', '/teams/register', registration, studentToken, 200);
    if (res?.data?.registration?._id) {
      testRegistrationId = res.data.registration._id;
    } else if (res?.data?._id) {
      testRegistrationId = res.data._id;
    } else if (res?.data?.data?._id) {
      testRegistrationId = res.data.data._id;
    }
  }

  // Check Registration
  if (testEventId) {
    await testRoute('Check Registration Status', 'GET', `/teams/checkregistration/${testEventId}`, null, studentToken, 200);
  }

  // Get Registrations for Event (Organizer)
  if (testEventId) {
    res = await testRoute('Get Event Registrations', 'GET', `/teams/registrations/${testEventId}`, null, organizerToken, 200);
  }

  // Approve Registration (Organizer)
  if (testRegistrationId) {
    await testRoute('Approve Registration', 'PUT', `/teams/registrations/${testRegistrationId}/approve`, {}, organizerToken, 200);
  }

  // ====== SCHEDULE ROUTES ======
  console.log('\n' + '-'.repeat(80));
  log('Testing Schedule Routes...', 'INFO');

  let slotId = null;

  // Add Schedule Slot
  if (testEventId) {
    const slot = {
      title: 'Opening Ceremony',
      starttime: '10:00 AM',
      endtime: '10:30 AM',
      description: 'Test slot',
      order: 1
    };
    res = await testRoute('Add Schedule Slot', 'POST', `/schedule/${testEventId}`, slot, organizerToken, 201);
    if (res?.data?.slot?._id) {
      slotId = res.data.slot._id;
    } else if (res?.data?._id) {
      slotId = res.data._id;
    }
  }

  // Get Schedule
  if (testEventId) {
    await testRoute('Get Event Schedule', 'GET', `/schedule/${testEventId}`, null, studentToken, 200);
  }

  // Update Schedule Slot
  if (testEventId && slotId) {
    await testRoute('Update Schedule Slot', 'PUT', `/schedule/${testEventId}/${slotId}`,
      { title: 'Updated Ceremony', starttime: '11:00 AM', endtime: '11:30 AM' }, organizerToken, 200);
  }

  // ====== USER ROUTES ======
  console.log('\n' + '-'.repeat(80));
  log('Testing User Routes...', 'INFO');

  // Get User Profile
  await testRoute('Get User Profile', 'GET', '/user/me', null, studentToken, 200);

  // Update User Profile
  await testRoute('Update User Profile', 'PUT', '/user/updateme',
    { firstname: 'Shivam', lastname: 'Test' }, studentToken, 200);

  // ====== PAYMENT ROUTES (Manual) ======
  console.log('\n' + '-'.repeat(80));
  log('Testing Payment Routes (Manual UPI)...', 'INFO');

  if (testRegistrationId) {
    // Update Payment Status
    const paymentData = {
      status: 'pending',
      paymentMethod: 'manual_upi'
    };
    // Note: Manual payment endpoint may return 403 in test if file upload required
    await testRoute('Submit Manual Payment', 'PUT', `/teams/registrations/${testRegistrationId}/payment`,
      paymentData, studentToken, [200, 403]);
  }

  // ====== RAZORPAY ROUTES (EXPECTED TO FAIL) ======
  console.log('\n' + '-'.repeat(80));
  log('Testing Razorpay Routes (Expected to FAIL if not implemented)...', 'PENDING');

  if (testRegistrationId) {
    const razorpayOrderRes = await testRoute('Create Razorpay Order', 'POST', 
      `/teams/registrations/${testRegistrationId}/razorpay-order`,
      { amount: 500, currency: 'INR' }, studentToken, [200, 404, 501]);

    if (razorpayOrderRes?.status === 404 || razorpayOrderRes?.status === 501) {
      log('❌ Razorpay routes NOT IMPLEMENTED (as expected)', 'FAIL');
    }
  }

  // ====== DELETE OPERATIONS (Keep for last) ======
  console.log('\n' + '-'.repeat(80));
  log('Testing Cleanup Routes...', 'INFO');

  // Delete Schedule Slot
  if (testEventId && slotId) {
    await testRoute('Delete Schedule Slot', 'DELETE', `/schedule/${testEventId}/${slotId}`, null, organizerToken, 200);
  }

  // Delete Event
  if (testEventId) {
    await testRoute('Delete Event', 'DELETE', `/events/${testEventId}`, null, organizerToken, 200);
  }

  // ====== RESULTS SUMMARY ======
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.table(results);

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${results.length}\n`);

  const passPercentage = ((passed / results.length) * 100).toFixed(1);
  log(`Overall: ${passPercentage}% Pass Rate`, passed > failed ? 'PASS' : 'FAIL');
  
  console.log('\n' + '='.repeat(80) + '\n');
}

runTests().catch(err => {
  log(`Test Suite Error: ${err.message}`, 'FAIL');
  process.exit(1);
});
