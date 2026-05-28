const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');
const query = require('../query/query.js');
const SalesPipelineModel = require('./sales_pipeline.js');

class OutletAdminModel {
    constructor(token) {
        this.token = token;
    }

    _getUserData() {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
        return JSON.parse(decoded.gen);
    }

    async getOutletList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';

            let conditions = '1=1';
            let params = [];

            if (search) {
                conditions += ' AND (o.OutletName LIKE ? OR o.OutletCode LIKE ? OR u.DisplayName LIKE ?)';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            const [countResult] = await esql.sqlQuery(
                `SELECT COUNT(*) AS total FROM outlet o JOIN users u ON o.OwnerId = u.UserId WHERE ${conditions}`, params
            );
            const total = countResult?.total || 0;

            const outlets = await esql.sqlQuery(`
                SELECT o.OutletId, o.OutletCode, o.OutletName, o.OutletTypeId, o.Address,
                    o.OwnerId, u.DisplayName AS OwnerName, u.MobilePhone AS OwnerPhone,
                    d.District, d.Province, o.StatusId, o.IsActive, o.InserDate,
                    (SELECT COUNT(*) FROM device_controller dc WHERE dc.OutletId = o.OutletId AND dc.IsActive=1) AS TotalDevice
                FROM outlet o
                JOIN users u ON o.OwnerId = u.UserId
                LEFT JOIN district d ON o.DistrictId = d.DistrictId
                WHERE ${conditions}
                ORDER BY o.InserDate DESC
                LIMIT ? OFFSET ?`, [...params, limit, offset]
            );

            return res.json({
                status: 'OK',
                data: {
                    outlets,
                    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }
                }
            });
        } catch (err) {
            console.error('getOutletList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async getOutletDetail(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const outletId = req.query.id;
            const [outlet] = await esql.sqlQuery(`
                SELECT o.*, u.DisplayName AS OwnerName, d.District, d.Province, d.FindimName
                FROM outlet o
                JOIN users u ON o.OwnerId = u.UserId
                LEFT JOIN district d ON o.DistrictId = d.DistrictId
                WHERE o.OutletId = ?`, [outletId]);

            if (!outlet) return res.json({ status: 'ERROR', message: 'Outlet tidak ditemukan' });

            return res.json({ status: 'OK', data: outlet });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async updateOutlet(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const { outlet_id, outlet_name, address, district_id, status_id } = req.body;

            if (!outlet_id) return res.json({ status: 'ERROR', message: 'outlet_id wajib' });

            let sets = [];
            let params = [];

            if (outlet_name) { sets.push('OutletName = ?'); params.push(outlet_name); }
            if (address !== undefined) { sets.push('Address = ?'); params.push(address); }
            if (district_id) { sets.push('DistrictId = ?'); params.push(district_id); }
            if (status_id !== undefined) { sets.push('StatusId = ?'); params.push(status_id); }

            if (!sets.length) return res.json({ status: 'ERROR', message: 'Tidak ada data yang diubah' });

            params.push(outlet_id);
            await esql.sqlQuery(`UPDATE outlet SET ${sets.join(', ')} WHERE OutletId = ?`, params);

            return res.json({ status: 'OK', message: 'Outlet berhasil diupdate' });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async createOutlet(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const { outlet_name, outlet_type_id, owner_id, address, district_id } = req.body;

            if (!outlet_name || !owner_id) {
                return res.json({ status: 'ERROR', message: 'Nama outlet dan owner wajib diisi' });
            }

            const result = await esql.sqlProcedure(query.sp_createOutlet, [
                outlet_name, owner_id, address || '',
                district_id || null, null, null, null, null, null, null
            ]);

            // Get the newly created outlet ID
            let newOutletId = null;
            if (result && result[0] && result[0][0]) {
                newOutletId = result[0][0].OutletId || result[0][0].outletId || result[0][0].LAST_INSERT_ID || null;
            }
            if (!newOutletId && result && result[0]) {
                // Some procedures return array directly
                const firstRow = Array.isArray(result[0]) ? result[0][0] : result[0];
                if (firstRow) newOutletId = firstRow.OutletId || firstRow.outletId || null;
            }
            if (!newOutletId) {
                // Try to get the latest outlet for this owner
                const latestResult = await esql.sqlQuery(
                    'SELECT OutletId FROM outlet WHERE OwnerId = ? ORDER BY OutletId DESC LIMIT 1',
                    [owner_id]
                );
                const latestOutlet = Array.isArray(latestResult) ? latestResult[0] : latestResult;
                newOutletId = latestOutlet ? (latestOutlet.OutletId || latestOutlet.outletId) : null;
            }

            // Sales Pipeline integration: for Admin (RoleId=2) or Sales (RoleId=6)
            const userRoleId = parseInt(userData.role_id);
            if ([2, 6].includes(userRoleId) && newOutletId) {
                try {
                    // Set outlet IsActive=0 (pending approval)
                    await esql.sqlQuery('UPDATE outlet SET IsActive = 0 WHERE OutletId = ?', [newOutletId]);

                    // Update pipeline milestone to "outlet_created"
                    const pipelineModel = new SalesPipelineModel(this.token);
                    await pipelineModel.updateMilestone(owner_id, 'outlet_created', userData.user_id);

                    // Create approval record in sales_pipeline_approval
                    const [pipeline] = await esql.sqlQuery(
                        'SELECT PipelineId FROM sales_pipeline WHERE OwnerId = ? LIMIT 1',
                        [owner_id]
                    );

                    if (pipeline && pipeline.PipelineId) {
                        await esql.sqlQuery(
                            `INSERT INTO sales_pipeline_approval (PipelineId, EntityType, EntityId, Status) VALUES (?, 'outlet', ?, 'pending')`,
                            [pipeline.PipelineId, newOutletId]
                        );
                    }
                } catch (pipelineErr) {
                    // Pipeline operations should not break outlet creation flow
                    console.error('Sales pipeline update error (outlet):', pipelineErr.message || pipelineErr);
                }
            }

            const message = [2, 6].includes(userRoleId)
                ? 'Outlet berhasil dibuat (menunggu approval Super Admin)'
                : 'Outlet berhasil dibuat';

            return res.json({ status: 'OK', message, data: { OutletId: newOutletId } });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async createOwner(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const Encrypt = require('../helpers/encrypt.js');
            const enc = new Encrypt();
            const { display_name, mobile_phone, password, email } = req.body;

            if (!display_name || !mobile_phone || !password) {
                return res.json({ status: 'ERROR', message: 'Nama, nomor HP, dan password wajib diisi' });
            }

            // Cek apakah nomor HP sudah terdaftar
            const [existing] = await esql.sqlQuery('SELECT UserId FROM users WHERE MobilePhone = ?', [mobile_phone]);
            if (existing) {
                return res.json({ status: 'ERROR', message: 'Nomor HP sudah terdaftar' });
            }

            // Encrypt password
            const encPassword = enc.EncryptAES(password, config.encKey);

            // Insert user dengan role 3 (Owner)
            await esql.sqlQuery(
                'INSERT INTO users (DisplayName, MobilePhone, Password, Email, RoleId, IsActive, IsLogin) VALUES (?, ?, ?, ?, 3, 1, 0)',
                [display_name, mobile_phone, encPassword, email || null]
            );

            // Get the new user ID
            const [newUser] = await esql.sqlQuery('SELECT UserId, DisplayName, MobilePhone FROM users WHERE MobilePhone = ? AND IsActive = 1', [mobile_phone]);

            // Insert into user_roles
            if (newUser && newUser.UserId) {
                await esql.sqlQuery(
                    'INSERT INTO user_roles (UserId, RoleId, IsActive, InsertBy) VALUES (?, 3, 1, 1)',
                    [newUser.UserId]
                );
            }

            return res.json({ status: 'OK', message: 'Owner berhasil ditambahkan', data: newUser });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }
}

module.exports = OutletAdminModel;
