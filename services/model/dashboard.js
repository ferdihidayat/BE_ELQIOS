const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');
const query = require('../query/query.js');

class DashboardModel {
    constructor(token) {
        this.token = token;
    }

    /**
     * GET /getDashboard
     * Header: Authorization: Bearer <token>
     * Token payload berisi { role_id, mobile_phone, ... }
     */
    async getDashboard(req, res) {
        let esql = new Esql();
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);

        if (tokenResult.status !== 'OK') {
            return res.json(tokenResult);
        }

        try {
            // Decode payload dari token untuk ambil role & mobile_phone
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
            const userData = JSON.parse(decoded.gen);
            const role_id = userData.role_id;
            const mobile_phone = userData.mobile_phone;

            let trxData, trxDetail, trxSummary, totalRevenue;

            if (role_id == 3) {
                // Owner — filter by mobile phone
                trxData     = await esql.sqlQuery(query.dashboardTrxHByPhone,     [mobile_phone]);
                trxDetail   = await esql.sqlQuery(query.dashboardTrxDByPhone,     [mobile_phone]);
                trxSummary  = await esql.sqlQuery(query.dashboardSummaryByPhone,  [mobile_phone]);
                totalRevenue = await esql.sqlQuery(query.dashboardRevenueByPhone, [mobile_phone]);
            } else {
                // Admin / role lain — semua data
                trxData     = await esql.sqlQuery(query.dashboardTrxH);
                trxDetail   = await esql.sqlQuery(query.dashboardTrxD);
                trxSummary  = await esql.sqlQuery(query.dashboardSummary);
                totalRevenue = await esql.sqlQuery(query.dashboardRevenue);
            }

            return res.json({
                status: 'OK',
                message: 'success',
                data: {
                    trxData,
                    trxDetail,
                    trxSummary,
                    totalRevenue,
                    user: userData
                }
            });

        } catch (err) {
            console.error('getDashboard error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    /**
     * POST /updateDashboardDevice
     * Body: { device_code, status_id }
     * Dipakai FE saat switch on/off device dari dashboard
     */
    async updateDeviceStatus(req, res) {
        let esql = new Esql();
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);

        if (tokenResult.status !== 'OK') {
            return res.json(tokenResult);
        }

        const { device_code, status_id } = req.body;

        if (!device_code || status_id === undefined) {
            return res.json({ status: 'ERROR', message: 'device_code dan status_id wajib diisi' });
        }

        try {
            await esql.sqlQuery(query.updateDeviceStatus, [status_id, device_code]);
            return res.json({ status: 'OK', message: 'Status device berhasil diupdate' });
        } catch (err) {
            console.error('updateDeviceStatus error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    /**
     * GET /getDashboardOwner
     * Header: Authorization: Bearer <token>
     * Return: device summary, today trx, monthly revenue (this vs last month), recent transactions
     */
    async getDashboardOwner(req, res) {
        let esql = new Esql();
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);

        if (tokenResult.status !== 'OK') {
            return res.json(tokenResult);
        }

        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
            const userData = JSON.parse(decoded.gen);
            const mobile_phone = userData.mobile_phone;

            const [deviceSummary] = await esql.sqlQuery(query.ownerDeviceSummary, [mobile_phone]);
            const [todayTrx]     = await esql.sqlQuery(query.ownerTodayTrx, [mobile_phone]);
            const monthlyRevenue = await esql.sqlQuery(query.ownerMonthlyRevenue, [mobile_phone]);
            const outletSummary  = await esql.sqlQuery(query.ownerOutletSummaryMonth, [mobile_phone]);

            // Pendapatan outlet bulan lalu (untuk perbandingan)
            const outletLastMonth = await esql.sqlQuery(`
                SELECT 
                  ot.OutletId, IFNULL(SUM(ct.Amount), 0) AS LastMonthAmount
                FROM outlet ot
                JOIN users u ON ot.OwnerId = u.UserId
                LEFT JOIN charge_trx ct ON ct.OutletCode = ot.OutletCode 
                  AND ct.PaymentStatus = 'settlement'
                  AND MONTH(ct.PaymentDate) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
                  AND YEAR(ct.PaymentDate) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
                WHERE u.MobilePhone = ? AND ot.IsActive = 1
                GROUP BY ot.OutletId`, [mobile_phone]);

            const deviceByType   = await esql.sqlQuery(query.ownerDeviceByType, [mobile_phone]);

            // Device usage count per device (current month)
            const deviceUsageMonth = await esql.sqlQuery(`
                SELECT ct.DeviceCode, dc.AliasName, COUNT(*) AS total_usage
                FROM charge_trx ct
                JOIN device_controller dc ON ct.DeviceCode = dc.DeviceCode
                JOIN outlet ot ON dc.OutletId = ot.OutletId
                JOIN users u ON ot.OwnerId = u.UserId
                WHERE ct.PaymentStatus = 'settlement'
                  AND u.MobilePhone = ?
                  AND MONTH(ct.PaymentDate) = MONTH(CURDATE())
                  AND YEAR(ct.PaymentDate) = YEAR(CURDATE())
                GROUP BY ct.DeviceCode, dc.AliasName
                ORDER BY total_usage DESC`, [mobile_phone]);

            // Transaksi harian (30 hari terakhir)
            let dailyTrx = [];
            try {
              dailyTrx = await esql.sqlQuery(`
                SELECT DATE(ct.PaymentDate) AS trx_date, COUNT(*) AS total_trx,
                  IFNULL(SUM(ct.Amount), 0) AS total_amount
                FROM charge_trx ct
                JOIN device_controller dc ON ct.DeviceCode = dc.DeviceCode
                JOIN outlet ot ON dc.OutletId = ot.OutletId
                JOIN users u ON ot.OwnerId = u.UserId
                WHERE ct.PaymentStatus = 'settlement'
                  AND u.MobilePhone = ?
                  AND ct.PaymentDate IS NOT NULL
                  AND ct.PaymentDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY trx_date
                ORDER BY trx_date ASC`, [mobile_phone]);
            } catch(e) { console.error('dailyTrx query error:', e); }

            // Jam sibuk (distribusi transaksi per jam, bulan ini)
            let peakHours = [];
            try {
              peakHours = await esql.sqlQuery(`
                SELECT HOUR(ct.PaymentDate) AS hour_of_day, COUNT(*) AS total_trx
                FROM charge_trx ct
                JOIN device_controller dc ON ct.DeviceCode = dc.DeviceCode
                JOIN outlet ot ON dc.OutletId = ot.OutletId
                JOIN users u ON ot.OwnerId = u.UserId
                WHERE ct.PaymentStatus = 'settlement'
                  AND u.MobilePhone = ?
                  AND ct.PaymentDate IS NOT NULL
                  AND MONTH(ct.PaymentDate) = MONTH(CURDATE())
                  AND YEAR(ct.PaymentDate) = YEAR(CURDATE())
                GROUP BY hour_of_day
                ORDER BY hour_of_day ASC`, [mobile_phone]);
            } catch(e) { console.error('peakHours query error:', e); }

            // Recent trx bulan berjalan (first page)
            const recentTrx = await esql.sqlQuery(query.ownerRecentTrx, [mobile_phone]);

            return res.json({
                status: 'OK',
                message: 'success',
                data: {
                    deviceSummary: deviceSummary || {},
                    deviceByType: deviceByType || [],
                    deviceUsageMonth: deviceUsageMonth || [],
                    dailyTrx: dailyTrx || [],
                    peakHours: peakHours || [],
                    todayTrx: todayTrx || {},
                    monthlyRevenue: monthlyRevenue || [],
                    recentTrx: recentTrx || [],
                    outletSummary: outletSummary || [],
                    outletLastMonth: outletLastMonth || [],
                    user: userData
                }
            });

        } catch (err) {
            console.error('getDashboardOwner error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    /**
     * POST /getOwnerTransactions
     * Header: Authorization: Bearer <token>
     * Body: { page, limit, search, start_date, end_date }
     * Return: paginated transactions for current month with filter
     */
    async getOwnerTransactions(req, res) {
        let esql = new Esql();
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);

        if (tokenResult.status !== 'OK') {
            return res.json(tokenResult);
        }

        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
            const userData = JSON.parse(decoded.gen);
            const mobile_phone = userData.mobile_phone;

            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.body.search || '';
            const start_date = req.body.start_date || null;
            const end_date = req.body.end_date || null;

            // Build WHERE conditions
            let conditions = `u.MobilePhone = ? AND ct.PaymentStatus = 'settlement'`;
            let params = [mobile_phone];

            // Date filter: default bulan berjalan
            if (start_date && end_date) {
                conditions += ` AND DATE(ct.PaymentDate) BETWEEN ? AND ?`;
                params.push(start_date, end_date);
            } else {
                conditions += ` AND MONTH(ct.PaymentDate) = MONTH(CURDATE()) AND YEAR(ct.PaymentDate) = YEAR(CURDATE())`;
            }

            // Search filter
            if (search) {
                conditions += ` AND (ct.OrderCode LIKE ? OR dc.AliasName LIKE ? OR ct.DeviceCode LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            const baseQuery = `
                FROM charge_trx ct
                JOIN device_controller dc ON ct.DeviceCode = dc.DeviceCode
                JOIN outlet ot ON dc.OutletId = ot.OutletId
                JOIN users u ON ot.OwnerId = u.UserId
                WHERE ${conditions}`;

            // Count total
            const countResult = await esql.sqlQuery(`SELECT COUNT(*) AS total ${baseQuery}`, params);
            const total = countResult[0]?.total || 0;

            // Get paginated data
            const dataQuery = `SELECT ct.OrderCode, ct.DeviceCode, dc.AliasName, ct.GrossAmount, ct.Amount, 
                ct.PaymentStatus, ct.PaymentDate, ct.Duration ${baseQuery} ORDER BY ct.PaymentDate DESC LIMIT ? OFFSET ?`;
            const dataParams = [...params, limit, offset];
            const transactions = await esql.sqlQuery(dataQuery, dataParams);

            const totalPages = Math.ceil(total / limit);

            return res.json({
                status: 'OK',
                data: {
                    transactions,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                }
            });

        } catch (err) {
            console.error('getOwnerTransactions error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }
    /**
     * GET /api/owner/outlet-detail?outlet_id=X
     * Header: Authorization: Bearer <token>
     * Return: outlet info, devices list, summary stats for a specific outlet owned by the user
     */
    async getOwnerOutletDetail(req, res) {
        let esql = new Esql();
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);

        if (tokenResult.status !== 'OK') {
            return res.json(tokenResult);
        }

        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
            const userData = JSON.parse(decoded.gen);
            const mobile_phone = userData.mobile_phone;
            const outlet_id = req.query.outlet_id;

            if (!outlet_id) {
                return res.json({ status: 'ERROR', message: 'outlet_id wajib diisi' });
            }

            // Get outlet info (verify ownership)
            const [outlet] = await esql.sqlQuery(`
                SELECT o.OutletId, o.OutletCode, o.OutletName, o.Address, o.StatusId, o.InserDate,
                    o.Latitude, o.Longitude, o.ServerKey,
                    d.District, d.Province, d.SubDistrict,
                    u.DisplayName AS OwnerName, u.MobilePhone AS OwnerPhone
                FROM outlet o
                JOIN users u ON o.OwnerId = u.UserId
                LEFT JOIN district d ON o.DistrictId = d.DistrictId
                WHERE o.OutletId = ? AND u.MobilePhone = ? AND o.IsActive = 1`, [outlet_id, mobile_phone]);

            if (!outlet) {
                return res.json({ status: 'ERROR', message: 'Outlet tidak ditemukan atau bukan milik Anda' });
            }

            // Get devices for this outlet
            const devices = await esql.sqlQuery(`
                SELECT dc.DeviceCode, dc.AliasName, dc.StatusId, dc.IsConnected,
                    dt.TypeCode, dt.AliasName AS DeviceType,
                    dc.Merk, dc.BrandType, dc.Capacity
                FROM device_controller dc
                LEFT JOIN device_type dt ON dc.DeviceTypeId = dt.Id
                WHERE dc.OutletId = ? AND dc.IsActive = 1
                ORDER BY dc.AliasName`, [outlet_id]);

            // Get today's transactions for this outlet
            const [todayStats] = await esql.sqlQuery(`
                SELECT 
                    COUNT(*) AS today_trx,
                    IFNULL(SUM(ct.GrossAmount), 0) AS today_gross,
                    IFNULL(SUM(ct.Amount), 0) AS today_amount
                FROM charge_trx ct
                WHERE ct.OutletCode = ? AND ct.PaymentStatus = 'settlement'
                    AND DATE(ct.PaymentDate) = CURDATE()`, [outlet.OutletCode]);

            // Get this month's stats
            const [monthStats] = await esql.sqlQuery(`
                SELECT 
                    COUNT(*) AS month_trx,
                    IFNULL(SUM(ct.GrossAmount), 0) AS month_gross,
                    IFNULL(SUM(ct.Amount), 0) AS month_amount
                FROM charge_trx ct
                WHERE ct.OutletCode = ? AND ct.PaymentStatus = 'settlement'
                    AND MONTH(ct.PaymentDate) = MONTH(CURDATE()) 
                    AND YEAR(ct.PaymentDate) = YEAR(CURDATE())`, [outlet.OutletCode]);

            // Get device count grouped by type
            const deviceByType = await esql.sqlQuery(`
                SELECT dt.AliasName AS DeviceType, dt.TypeCode, COUNT(*) AS total
                FROM device_controller dc
                LEFT JOIN device_type dt ON dc.DeviceTypeId = dt.Id
                WHERE dc.OutletId = ? AND dc.IsActive = 1
                GROUP BY dc.DeviceTypeId, dt.AliasName, dt.TypeCode
                ORDER BY total DESC`, [outlet_id]);

            // Get monthly revenue trend (last 6 months)
            const monthlyRevenue = await esql.sqlQuery(`
                SELECT 
                    DATE_FORMAT(ct.PaymentDate, '%Y-%m') AS month,
                    COUNT(*) AS total_trx,
                    IFNULL(SUM(ct.GrossAmount), 0) AS total_gross,
                    IFNULL(SUM(ct.Amount), 0) AS total_amount
                FROM charge_trx ct
                WHERE ct.OutletCode = ? AND ct.PaymentStatus = 'settlement'
                    AND ct.PaymentDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY month
                ORDER BY month ASC`, [outlet.OutletCode]);

            return res.json({
                status: 'OK',
                data: {
                    outlet,
                    devices: devices || [],
                    deviceByType: deviceByType || [],
                    todayStats: todayStats || {},
                    monthStats: monthStats || {},
                    monthlyRevenue: monthlyRevenue || []
                }
            });

        } catch (err) {
            console.error('getOwnerOutletDetail error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    /**
     * POST /api/owner/outlet-transactions
     * Header: Authorization: Bearer <token>
     * Body: { outlet_id, page, limit, search, start_date, end_date }
     * Return: paginated transactions for a specific outlet
     */
    async getOwnerOutletTransactions(req, res) {
        let esql = new Esql();
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);

        if (tokenResult.status !== 'OK') {
            return res.json(tokenResult);
        }

        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
            const userData = JSON.parse(decoded.gen);
            const mobile_phone = userData.mobile_phone;

            const outlet_id = req.body.outlet_id;
            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.body.search || '';
            const start_date = req.body.start_date || null;
            const end_date = req.body.end_date || null;

            if (!outlet_id) {
                return res.json({ status: 'ERROR', message: 'outlet_id wajib diisi' });
            }

            // Verify ownership
            const [outlet] = await esql.sqlQuery(`
                SELECT o.OutletCode FROM outlet o
                JOIN users u ON o.OwnerId = u.UserId
                WHERE o.OutletId = ? AND u.MobilePhone = ? AND o.IsActive = 1`, [outlet_id, mobile_phone]);

            if (!outlet) {
                return res.json({ status: 'ERROR', message: 'Outlet tidak ditemukan' });
            }

            let conditions = `ct.OutletCode = ? AND ct.PaymentStatus = 'settlement'`;
            let params = [outlet.OutletCode];

            if (start_date && end_date) {
                conditions += ` AND DATE(ct.PaymentDate) BETWEEN ? AND ?`;
                params.push(start_date, end_date);
            }

            if (search) {
                conditions += ` AND (ct.OrderCode LIKE ? OR dc.AliasName LIKE ? OR ct.DeviceCode LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            const baseQuery = `
                FROM charge_trx ct
                JOIN device_controller dc ON ct.DeviceCode = dc.DeviceCode
                WHERE ${conditions}`;

            const countResult = await esql.sqlQuery(`SELECT COUNT(*) AS total ${baseQuery}`, params);
            const total = countResult[0]?.total || 0;

            const dataQuery = `SELECT ct.OrderCode, ct.DeviceCode, dc.AliasName, ct.GrossAmount, ct.Amount, 
                ct.PaymentStatus, ct.PaymentDate, ct.Duration ${baseQuery} ORDER BY ct.PaymentDate DESC LIMIT ? OFFSET ?`;
            const transactions = await esql.sqlQuery(dataQuery, [...params, limit, offset]);

            const totalPages = Math.ceil(total / limit);

            return res.json({
                status: 'OK',
                data: {
                    transactions: transactions || [],
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                }
            });

        } catch (err) {
            console.error('getOwnerOutletTransactions error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    /**
     * GET /api/owner/device-detail?device_code=X
     * Header: Authorization: Bearer <token>
     * Return: device info, price list, recent transactions for a specific device owned by the user
     */
    async getOwnerDeviceDetail(req, res) {
        let esql = new Esql();
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);

        if (tokenResult.status !== 'OK') {
            return res.json(tokenResult);
        }

        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
            const userData = JSON.parse(decoded.gen);
            const mobile_phone = userData.mobile_phone;
            const device_code = req.query.device_code;

            if (!device_code) {
                return res.json({ status: 'ERROR', message: 'device_code wajib diisi' });
            }

            // Get device info (verify ownership)
            const deviceResult = await esql.sqlQuery(`
                SELECT dc.DeviceId, dc.DeviceCode, dc.AliasName, dc.StatusId, dc.IsConnected,
                    dc.Merk, dc.BrandType, dc.Capacity, dc.OutletId,
                    dt.TypeCode, dt.AliasName AS DeviceType, dt.TypeName,
                    o.OutletName, o.OutletCode, o.Address AS OutletAddress
                FROM device_controller dc
                LEFT JOIN device_type dt ON dc.DeviceTypeId = dt.Id
                JOIN outlet o ON dc.OutletId = o.OutletId
                JOIN users u ON o.OwnerId = u.UserId
                WHERE dc.DeviceCode = ? AND u.MobilePhone = ? AND dc.IsActive = 1`, [device_code, mobile_phone]);

            const device = deviceResult && deviceResult[0] ? deviceResult[0] : null;

            if (!device) {
                return res.json({ status: 'ERROR', message: 'Device tidak ditemukan atau bukan milik Anda' });
            }

            // Get price list for this device
            let priceList = [];
            try {
                priceList = await esql.sqlQuery(`
                    SELECT Id AS PriceId, Duration, Price, IsActive
                    FROM device_price_list
                    WHERE DeviceId = ? AND IsActive = 1
                    ORDER BY Duration ASC`, [device.DeviceId]);
            } catch(e) { console.error('priceList query error:', e); }

            // Get today's stats for this device
            let todayStats = {};
            try {
                const todayResult = await esql.sqlQuery(`
                    SELECT 
                        COUNT(*) AS today_trx,
                        IFNULL(SUM(ct.GrossAmount), 0) AS today_gross,
                        IFNULL(SUM(ct.Amount), 0) AS today_amount
                    FROM charge_trx ct
                    WHERE ct.DeviceCode = ? AND ct.PaymentStatus = 'settlement'
                        AND DATE(ct.PaymentDate) = CURDATE()`, [device_code]);
                todayStats = todayResult[0] || {};
            } catch(e) { console.error('todayStats query error:', e); }

            // Get this month's stats for this device
            let monthStats = {};
            try {
                const monthResult = await esql.sqlQuery(`
                    SELECT 
                        COUNT(*) AS month_trx,
                        IFNULL(SUM(ct.GrossAmount), 0) AS month_gross,
                        IFNULL(SUM(ct.Amount), 0) AS month_amount
                    FROM charge_trx ct
                    WHERE ct.DeviceCode = ? AND ct.PaymentStatus = 'settlement'
                        AND MONTH(ct.PaymentDate) = MONTH(CURDATE()) 
                        AND YEAR(ct.PaymentDate) = YEAR(CURDATE())`, [device_code]);
                monthStats = monthResult[0] || {};
            } catch(e) { console.error('monthStats query error:', e); }

            // Get recent transactions (last 20)
            let recentTrx = [];
            try {
                recentTrx = await esql.sqlQuery(`
                    SELECT ct.OrderCode, ct.GrossAmount, ct.Amount, ct.Duration,
                        ct.PaymentStatus, ct.PaymentDate
                    FROM charge_trx ct
                    WHERE ct.DeviceCode = ? AND ct.PaymentStatus = 'settlement'
                    ORDER BY ct.PaymentDate DESC
                    LIMIT 20`, [device_code]);
            } catch(e) { console.error('recentTrx query error:', e); }

            return res.json({
                status: 'OK',
                data: {
                    device,
                    priceList: priceList || [],
                    todayStats,
                    monthStats,
                    recentTrx: recentTrx || []
                }
            });

        } catch (err) {
            console.error('getOwnerDeviceDetail error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }
}

module.exports = DashboardModel;
