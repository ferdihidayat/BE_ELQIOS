const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');
const SalesPipelineModel = require('./sales_pipeline.js');

class DeviceAdminModel {
    constructor(token) {
        this.token = token;
    }

    _getUserData() {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
        return JSON.parse(decoded.gen);
    }

    async getDeviceList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';
            const status = req.query.status || ''; // all, active, pending

            let conditions = '1=1';
            let params = [];

            if (status === 'active') { conditions += ' AND dc.IsActive = 1'; }
            else if (status === 'pending') { conditions += ' AND dc.IsActive = 0'; }

            if (search) {
                conditions += ' AND (dc.DeviceCode LIKE ? OR dc.AliasName LIKE ? OR o.OutletName LIKE ?)';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            // Filter by outlet_id if provided
            const outletIdFilter = req.query.outlet_id;
            if (outletIdFilter) {
                conditions += ' AND dc.OutletId = ?';
                params.push(parseInt(outletIdFilter));
            }

            const [countResult] = await esql.sqlQuery(
                `SELECT COUNT(*) AS total FROM device_controller dc JOIN outlet o ON dc.OutletId = o.OutletId WHERE ${conditions}`, params
            );
            const total = countResult?.total || 0;

            const devices = await esql.sqlQuery(`
                SELECT dc.DeviceId, dc.DeviceCode, dc.AliasName, dc.OutletId,
                    o.OutletName, o.OutletCode, dc.DeviceTypeId, dt.TypeName, dt.TypeCode,
                    dc.Merk, dc.BrandType, dc.Capacity, dc.StatusId, dc.IsActive, dc.IsConnected,
                    dc.ControllerTypeId
                FROM device_controller dc
                JOIN outlet o ON dc.OutletId = o.OutletId
                LEFT JOIN device_type dt ON dc.DeviceTypeId = dt.Id
                WHERE ${conditions}
                ORDER BY dc.DeviceId DESC
                LIMIT ? OFFSET ?`, [...params, limit, offset]);

            return res.json({
                status: 'OK',
                data: {
                    devices,
                    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }
                }
            });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async createDevice(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const { alias_name, outlet_id, device_type_id, merk, brand_type, capacity, agreement_id, controller_type_id } = req.body;

            if (!alias_name || !outlet_id || !device_type_id) {
                return res.json({ status: 'ERROR', message: 'Nama mesin, outlet, dan tipe wajib diisi' });
            }

            // Validate MLA device count limit if agreement_id is provided
            if (agreement_id) {
                const [mla] = await esql.sqlQuery('SELECT DeviceCount FROM master_lease_agreement WHERE AgreementId = ?', [parseInt(agreement_id)]);
                if (mla && mla.DeviceCount > 0) {
                    const [deviceCount] = await esql.sqlQuery('SELECT COUNT(*) AS cnt FROM device_controller WHERE AgreementId = ?', [parseInt(agreement_id)]);
                    if (deviceCount && deviceCount.cnt >= mla.DeviceCount) {
                        return res.json({ status: 'ERROR', message: `Jumlah device sudah mencapai target MLA (${mla.DeviceCount} device). Tidak dapat menambah device lagi.` });
                    }
                }
            }

            // Auto-generate DeviceCode from OutletCode + sequential number
            // Format: {OutletCode}-{XXX} e.g. BKS1-JIH10005-001
            const [outletData] = await esql.sqlQuery(
                'SELECT OutletCode FROM outlet WHERE OutletId = ?', [outlet_id]
            );
            const outletCode = (outletData && outletData.OutletCode) ? outletData.OutletCode : 'UNKNOWN';

            // Get the highest existing sequence for this outlet
            const [lastDevice] = await esql.sqlQuery(
                `SELECT DeviceCode FROM device_controller WHERE OutletId = ? AND DeviceCode LIKE ? ORDER BY DeviceCode DESC LIMIT 1`,
                [outlet_id, `${outletCode}-%`]
            );

            let nextSeq = 1;
            if (lastDevice && lastDevice.DeviceCode) {
                const parts = lastDevice.DeviceCode.split('-');
                const lastNum = parseInt(parts[parts.length - 1]) || 0;
                nextSeq = lastNum + 1;
            }

            const deviceCode = `${outletCode}-${String(nextSeq).padStart(3, '0')}`;

            // Role 1 → langsung aktif, Role 2 → pending (IsActive=0)
            const isActive = userData.role_id === 1 ? 1 : 0;

            await esql.sqlQuery(`
                INSERT INTO device_controller (DeviceCode, AliasName, OutletId, DeviceTypeId, ControllerTypeId, Merk, BrandType, Capacity, StatusId, IsActive, IsConnected, AgreementId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?)`,
                [deviceCode, alias_name, outlet_id, device_type_id, controller_type_id ? parseInt(controller_type_id) : null, merk || null, brand_type || null, capacity || null, isActive, agreement_id ? parseInt(agreement_id) : null]
            );

            // Ambil DeviceId yang baru dibuat
            const [newDevice] = await esql.sqlQuery(
                `SELECT DeviceId FROM device_controller WHERE AliasName = ? AND OutletId = ? AND DeviceTypeId = ? ORDER BY DeviceId DESC LIMIT 1`,
                [alias_name, outlet_id, device_type_id]
            );

            // Copy price template ke device_price_list berdasarkan DeviceId baru
            if (newDevice && newDevice.DeviceId) {
                try {
                    await esql.sqlQuery(`
                        INSERT INTO device_price_list (DeviceId, Price, Duration, UOM, IsActive)
                        SELECT ?, Price, Duration, UOM, 1
                        FROM device_price_list_template
                        WHERE IsActive = 1`,
                        [newDevice.DeviceId]
                    );
                } catch(e) {
                    console.error('Copy price template error (mungkin tabel belum ada):', e.msgError || e);
                }
            }

            // Sales Pipeline integration: trigger milestone update for Admin/Sales (RoleId 2 or 6)
            if ([2, 6].includes(userData.role_id) && newDevice && newDevice.DeviceId) {
                try {
                    // Get the OwnerId from the outlet that this device belongs to
                    const [outlet] = await esql.sqlQuery(
                        'SELECT OwnerId FROM outlet WHERE OutletId = ?', [outlet_id]
                    );

                    if (outlet && outlet.OwnerId) {
                        // Update pipeline milestone to "device_created"
                        const pipelineModel = new SalesPipelineModel(this.token);
                        await pipelineModel.updateMilestone(outlet.OwnerId, 'device_created', userData.user_id);

                        // Create approval record in sales_pipeline_approval
                        const [pipeline] = await esql.sqlQuery(
                            'SELECT PipelineId FROM sales_pipeline WHERE OwnerId = ? LIMIT 1',
                            [outlet.OwnerId]
                        );

                        if (pipeline && pipeline.PipelineId) {
                            await esql.sqlQuery(
                                `INSERT INTO sales_pipeline_approval (PipelineId, EntityType, EntityId, Status) VALUES (?, 'device', ?, 'pending')`,
                                [pipeline.PipelineId, newDevice.DeviceId]
                            );
                        }
                    }
                } catch (pipelineErr) {
                    // Pipeline operations should not break device creation flow
                    console.error('Sales pipeline update error (device):', pipelineErr.message || pipelineErr);
                }
            }

            const message = isActive ? 'Device berhasil dibuat dan aktif' : 'Device berhasil dibuat (menunggu approval Super Admin)';
            return res.json({ status: 'OK', message, deviceId: newDevice?.DeviceId || null });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async approveDevice(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Hanya role 1 yang bisa approve
            if (userData.role_id !== 1) {
                return res.json({ status: 'ERROR', message: 'Hanya Super Admin yang bisa approve device' });
            }

            const { device_id } = req.body;
            if (!device_id) return res.json({ status: 'ERROR', message: 'device_id wajib' });

            await esql.sqlQuery('UPDATE device_controller SET IsActive = 1 WHERE DeviceId = ?', [device_id]);
            return res.json({ status: 'OK', message: 'Device berhasil diaktifkan' });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async updateDevice(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const { device_id, alias_name, merk, brand_type, capacity, agreement_id, controller_type_id } = req.body;
            if (!device_id) return res.json({ status: 'ERROR', message: 'device_id wajib' });

            let sets = [], params = [];
            if (alias_name) { sets.push('AliasName = ?'); params.push(alias_name); }
            if (merk !== undefined) { sets.push('Merk = ?'); params.push(merk); }
            if (brand_type !== undefined) { sets.push('BrandType = ?'); params.push(brand_type); }
            if (capacity !== undefined) { sets.push('Capacity = ?'); params.push(capacity); }
            if (agreement_id !== undefined) { sets.push('AgreementId = ?'); params.push(agreement_id ? parseInt(agreement_id) : null); }
            if (controller_type_id !== undefined) { sets.push('ControllerTypeId = ?'); params.push(controller_type_id ? parseInt(controller_type_id) : null); }

            if (!sets.length) return res.json({ status: 'ERROR', message: 'Tidak ada data yang diubah' });

            params.push(device_id);
            await esql.sqlQuery(`UPDATE device_controller SET ${sets.join(', ')} WHERE DeviceId = ?`, params);
            return res.json({ status: 'OK', message: 'Device berhasil diupdate' });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }


    async getProductsByDeviceType(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const deviceTypeId = parseInt(req.query.device_type_id) || 0;

            if (!deviceTypeId) {
                return res.json({ status: 'ERROR', message: 'device_type_id wajib diisi' });
            }

            const products = await esql.sqlQuery(
                `SELECT dt.TypeName, pp.Merk, pp.TypeCode FROM device_type dt JOIN patner_product pp ON dt.Id = pp.DeviceTypeId WHERE dt.Id = ${deviceTypeId}`
            );

            return res.json({ status: 'OK', data: { products: products || [] } });
        } catch (err) {
            console.error('getProductsByDeviceType error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.msgError || err.message || 'Internal error' });
        }
    }
}

module.exports = DeviceAdminModel;
