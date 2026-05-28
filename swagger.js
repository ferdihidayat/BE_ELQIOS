const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ELQIOS Backend API',
      version: '1.0.0',
      description: 'API Documentation untuk Backend ELQIOS - Laundry QRIS Management System',
      contact: { name: 'ELQIOS Team' }
    },
    servers: [
      { url: 'http://localhost:8881', description: 'Development' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Authentication & Token' },
      { name: 'Dashboard', description: 'Dashboard data' },
      { name: 'Device', description: 'Device Management' },
      { name: 'Outlet', description: 'Outlet Management' },
      { name: 'User', description: 'User Management' },
      { name: 'Wallet', description: 'Wallet & Withdrawal' },
      { name: 'Sales Pipeline', description: 'Sales Pipeline & Tracker' },
      { name: 'Project Tracker', description: 'Project Tracker' },
      { name: 'Partner', description: 'Partner Management' },
      { name: 'Payment', description: 'Payment & Charge' },
      { name: 'Misc', description: 'Miscellaneous' }
    ],
    paths: {
      // ── Auth ──
      '/getToken': {
        post: { tags: ['Auth'], summary: 'Get JWT Token', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Token response' } } }
      },
      '/checkToken': {
        post: { tags: ['Auth'], summary: 'Check Token validity', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Token status' } } }
      },
      '/signinWeb': {
        post: { tags: ['Auth'], summary: 'Sign In (Web Dashboard)', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { mobile_phone: { type: 'string' }, pin: { type: 'string' } }, required: ['mobile_phone', 'pin'] } } } }, responses: { 200: { description: 'Login result with token' } } }
      },
      '/signin': {
        post: { tags: ['Auth'], summary: 'Sign In (Mobile)', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { mobile_phone: { type: 'string' }, pin: { type: 'string' } } } } } }, responses: { 200: { description: 'Login result' } } }
      },
      '/signUp': {
        post: { tags: ['Auth'], summary: 'Sign Up', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Registration result' } } }
      },
      '/signOut': {
        post: { tags: ['Auth'], summary: 'Sign Out', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { mobile_phone: { type: 'string' }, uuid: { type: 'string' } } } } } }, responses: { 200: { description: 'Logout result' } } }
      },
      '/encrypt': {
        post: { tags: ['Auth'], summary: 'Encrypt data', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Encrypted result' } } }
      },
      '/decrypt': {
        post: { tags: ['Auth'], summary: 'Decrypt data', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Decrypted result' } } }
      },

      // ── Dashboard ──
      '/getDashboard': {
        get: { tags: ['Dashboard'], summary: 'Get Dashboard (Admin)', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Dashboard data' } } }
      },
      '/getDashboardAdmin': {
        get: { tags: ['Dashboard'], summary: 'Get Dashboard Admin', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Admin dashboard data' } } }
      },
      '/getDashboardOwner': {
        get: { tags: ['Dashboard'], summary: 'Get Dashboard Owner', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Owner dashboard data' } } }
      },

      // ── Device Management (Admin) ──
      '/api/devices': {
        get: { tags: ['Device'], summary: 'Get Device List (Admin)', security: [{ BearerAuth: [] }], parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['', 'active', 'pending'] } },
          { name: 'outlet_id', in: 'query', schema: { type: 'integer' } }
        ], responses: { 200: { description: 'Paginated device list' } } }
      },
      '/api/device/create': {
        post: { tags: ['Device'], summary: 'Create Device', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { alias_name: { type: 'string' }, outlet_id: { type: 'integer' }, device_type_id: { type: 'integer' }, merk: { type: 'string' }, brand_type: { type: 'string' }, capacity: { type: 'string' }, controller_type_id: { type: 'integer' } } } } } }, responses: { 200: { description: 'Create result' } } }
      },
      '/api/device/update': {
        post: { tags: ['Device'], summary: 'Update Device', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { device_id: { type: 'integer' }, alias_name: { type: 'string' }, merk: { type: 'string' }, brand_type: { type: 'string' }, capacity: { type: 'string' }, controller_type_id: { type: 'integer' } } } } } }, responses: { 200: { description: 'Update result' } } }
      },
      '/api/device/approve': {
        post: { tags: ['Device'], summary: 'Approve Device', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { device_id: { type: 'integer' } } } } } }, responses: { 200: { description: 'Approve result' } } }
      },
      '/api/device/types': {
        get: { tags: ['Device'], summary: 'Get Device Types', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Device types list' } } }
      },
      '/api/controller-types': {
        get: { tags: ['Device'], summary: 'Get Controller Types by DeviceTypeId', security: [{ BearerAuth: [] }], parameters: [
          { name: 'device_type_id', in: 'query', required: true, schema: { type: 'integer' } }
        ], responses: { 200: { description: 'Controller types list with BaseCode' } } }
      },
      '/api/device/products': {
        get: { tags: ['Device'], summary: 'Get Products by Device Type', security: [{ BearerAuth: [] }], parameters: [
          { name: 'device_type_id', in: 'query', required: true, schema: { type: 'integer' } }
        ], responses: { 200: { description: 'Products list' } } }
      },

      // ── User Management ──
      '/api/users': {
        get: { tags: ['User'], summary: 'Get User List', security: [{ BearerAuth: [] }], parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'integer' } }
        ], responses: { 200: { description: 'User list' } } }
      },
      '/api/user/create': {
        post: { tags: ['User'], summary: 'Create User', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { display_name: { type: 'string' }, mobile_phone: { type: 'string' }, password: { type: 'string' }, email: { type: 'string' }, role_id: { type: 'integer' }, bank_name: { type: 'string' }, bank_no: { type: 'string' }, account_name: { type: 'string' } } } } } }, responses: { 200: { description: 'Create result' } } }
      },
      '/api/user/update': {
        post: { tags: ['User'], summary: 'Update User', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Update result' } } }
      },
      '/api/user/detail': {
        get: { tags: ['User'], summary: 'Get User Detail', security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'User detail' } } }
      },
      '/api/user/reset-password': {
        post: { tags: ['User'], summary: 'Reset User Password', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { user_id: { type: 'integer' }, new_password: { type: 'string' } } } } } }, responses: { 200: { description: 'Reset result' } } }
      },

      // ── Outlet ──
      '/api/outlets': {
        get: { tags: ['Outlet'], summary: 'Get Outlet List (Admin)', security: [{ BearerAuth: [] }], parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ], responses: { 200: { description: 'Outlet list' } } }
      },
      '/api/outlet/create': {
        post: { tags: ['Outlet'], summary: 'Create Outlet', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Create result' } } }
      },
      '/api/outlet/update': {
        post: { tags: ['Outlet'], summary: 'Update Outlet', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Update result' } } }
      },
      '/api/owner/create': {
        post: { tags: ['Outlet'], summary: 'Create Owner', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { display_name: { type: 'string' }, mobile_phone: { type: 'string' }, password: { type: 'string' }, email: { type: 'string' } } } } } }, responses: { 200: { description: 'Create owner result' } } }
      },
      '/api/owner/payment-status': {
        get: { tags: ['Outlet'], summary: 'Check Owner Payment Status', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Payment status (has_active_outlet, has_unpaid_subscription)' } } }
      },

      // ── Wallet & Withdrawal ──
      '/api/wallet': {
        get: { tags: ['Wallet'], summary: 'Get Wallet Data (per outlet)', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Wallet data with outlets saldo' } } }
      },
      '/requestWithdrawal': {
        post: { tags: ['Wallet'], summary: 'Request Withdrawal', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { userid: { type: 'string' }, amount: { type: 'string' }, outlet_code: { type: 'string' } } } } } }, responses: { 200: { description: 'Withdrawal request result' } } }
      },
      '/disbursement': {
        post: { tags: ['Wallet'], summary: 'Process Disbursement (Accept Withdrawal)', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { trx_no: { type: 'string' }, userid: { type: 'string' }, amount: { type: 'string' } } } } } }, responses: { 200: { description: 'Disbursement result' } } }
      },
      '/api/withdrawals': {
        get: { tags: ['Wallet'], summary: 'Get Withdrawal List (Admin)', security: [{ BearerAuth: [] }], parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ], responses: { 200: { description: 'Withdrawal list' } } }
      },

      // ── Payment ──
      '/charge': {
        post: { tags: ['Payment'], summary: 'Create QRIS Charge', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Charge result' } } }
      },
      '/getpaymentstatus': {
        post: { tags: ['Payment'], summary: 'Get Payment Status', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Payment status' } } }
      },

      // ── Sales Pipeline ──
      '/api/sales-pipeline/list': {
        get: { tags: ['Sales Pipeline'], summary: 'Get Sales Pipeline List', security: [{ BearerAuth: [] }], parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ], responses: { 200: { description: 'Pipeline list' } } }
      },
      '/api/sales-pipeline/detail': {
        get: { tags: ['Sales Pipeline'], summary: 'Get Pipeline Detail', security: [{ BearerAuth: [] }], parameters: [{ name: 'owner_id', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'Pipeline detail' } } }
      },
      '/api/sales-pipeline/approve-pipeline': {
        post: { tags: ['Sales Pipeline'], summary: 'Approve Pipeline (creates Project Tracker)', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { owner_id: { type: 'integer' } } } } } }, responses: { 200: { description: 'Approve result' } } }
      },

      // ── Project Tracker ──
      '/api/project-tracker/list': {
        get: { tags: ['Project Tracker'], summary: 'Get Project Tracker List', security: [{ BearerAuth: [] }], parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ], responses: { 200: { description: 'Project tracker list' } } }
      },
      '/api/project-tracker/detail': {
        get: { tags: ['Project Tracker'], summary: 'Get Project Tracker Detail', security: [{ BearerAuth: [] }], parameters: [{ name: 'project_tracker_id', in: 'query', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Project tracker detail' } } }
      },
      '/api/project-tracker/advance-milestone': {
        post: { tags: ['Project Tracker'], summary: 'Advance Project Milestone', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { project_tracker_id: { type: 'integer' }, new_milestone: { type: 'string', enum: ['perakitan', 'instalasi'] }, notes: { type: 'string' } } } } } }, responses: { 200: { description: 'Milestone update result' } } }
      },

      // ── Partner ──
      '/api/partner/list': {
        get: { tags: ['Partner'], summary: 'Get Partner List', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Partner list' } } }
      },
      '/api/partner/create': {
        post: { tags: ['Partner'], summary: 'Create Partner', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Create result' } } }
      },
      '/api/lease-agreement/list': {
        get: { tags: ['Partner'], summary: 'Get Lease Agreement List', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Lease agreement list' } } }
      },
      '/api/lease-agreement/create': {
        post: { tags: ['Partner'], summary: 'Create Lease Agreement', security: [{ BearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Create result' } } }
      },
      '/api/subscription-plans': {
        get: { tags: ['Partner'], summary: 'Get Subscription Plans', security: [{ BearerAuth: [] }], responses: { 200: { description: 'Subscription plans list' } } }
      },

      // ── Misc ──
      '/uuid': {
        get: { tags: ['Misc'], summary: 'Generate UUID', responses: { 200: { description: 'UUID' } } }
      },
      '/cekdevices_status': {
        get: { tags: ['Device'], summary: 'Check Device Status by Code', parameters: [{ name: 'device_code', in: 'query', required: true, schema: { type: 'string' } }, { name: 'min_power_standby', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Device status' } } }
      },
      '/checkControllerVersioning2026022101': {
        get: { tags: ['Device'], summary: 'Check Controller Versioning', parameters: [{ name: 'device_code', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Versioning info' } } }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
