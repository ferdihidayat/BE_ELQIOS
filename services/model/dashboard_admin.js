const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');

class DashboardAdminModel {
    constructor(token) {
        this.token = token;
    }

    async getDashboardAdmin(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();

            // Summary stats
            const [totalOutlet] = await esql.sqlQuery('SELECT COUNT(*) AS total FROM outlet WHERE IsActive=1');
            const [totalDevice] = await esql.sqlQuery('SELECT COUNT(*) AS total FROM device_controller WHERE IsActive=1');
            const [totalOwner] = await esql.sqlQuery('SELECT COUNT(*) AS total FROM users WHERE RoleId=3 AND IsActive=1');
            const [pendingDevice] = await esql.sqlQuery('SELECT COUNT(*) AS total FROM device_controller WHERE IsActive=0');
            const [trxMonth] = await esql.sqlQuery(`SELECT COUNT(*) AS total_trx, IFNULL(SUM(GrossAmount),0) AS total_revenue 
                FROM charge_trx WHERE PaymentStatus='settlement' 
                AND MONTH(PaymentDate)=MONTH(CURDATE()) AND YEAR(PaymentDate)=YEAR(CURDATE())`);

            // Outlet per district/area
            const outletPerArea = await esql.sqlQuery(`
                SELECT d.Province, d.District, COUNT(o.OutletId) AS total_outlet,
                    (SELECT COUNT(*) FROM device_controller dc WHERE dc.OutletId IN 
                        (SELECT o2.OutletId FROM outlet o2 WHERE o2.DistrictId = d.DistrictId AND o2.IsActive=1) 
                        AND dc.IsActive=1) AS total_device
                FROM outlet o
                JOIN district d ON o.DistrictId = d.DistrictId
                WHERE o.IsActive = 1 AND d.IsActive = 1
                GROUP BY d.DistrictId, d.Province, d.District
                ORDER BY total_outlet DESC`);

            // Monthly revenue trend (6 bulan terakhir)
            const monthlyTrend = await esql.sqlQuery(`
                SELECT DATE_FORMAT(PaymentDate, '%Y-%m') AS month,
                    COUNT(*) AS total_trx,
                    IFNULL(SUM(GrossAmount),0) AS total_revenue
                FROM charge_trx
                WHERE PaymentStatus = 'settlement'
                    AND PaymentDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY month
                ORDER BY month ASC`);

            // Recent outlets
            const recentOutlets = await esql.sqlQuery(`
                SELECT o.OutletCode, o.OutletName, u.DisplayName AS OwnerName, 
                    d.District, o.InserDate
                FROM outlet o
                JOIN users u ON o.OwnerId = u.UserId
                LEFT JOIN district d ON o.DistrictId = d.DistrictId
                WHERE o.IsActive = 1
                ORDER BY o.InserDate DESC
                LIMIT 10`);

            return res.json({
                status: 'OK',
                data: {
                    summary: {
                        total_outlet: totalOutlet?.total || 0,
                        total_device: totalDevice?.total || 0,
                        total_owner: totalOwner?.total || 0,
                        pending_device: pendingDevice?.total || 0,
                        trx_month: trxMonth?.total_trx || 0,
                        revenue_month: trxMonth?.total_revenue || 0
                    },
                    outletPerArea: outletPerArea || [],
                    monthlyTrend: monthlyTrend || [],
                    recentOutlets: recentOutlets || []
                }
            });
        } catch (err) {
            console.error('getDashboardAdmin error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }
}

module.exports = DashboardAdminModel;
