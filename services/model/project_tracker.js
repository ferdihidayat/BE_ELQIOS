const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');
const query = require('../query/query.js');

class ProjectTrackerModel {
    constructor(token) {
        this.token = token;
    }

    _getUserData() {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
        return JSON.parse(decoded.gen);
    }

    /**
     * Create a new project tracker record when a sales pipeline is approved
     * @param {number} pipelineId - The approved pipeline's PipelineId
     * @param {number} ownerId - The owner's UserId
     * @param {number} approvedBy - The Super Admin UserId who approved
     */
    async createProjectTracker(pipelineId, ownerId, approvedBy) {
        try {
            let esql = new Esql();
            const result = await esql.sqlProcedure(query.SP_CreateProjectTracker, [pipelineId, ownerId, approvedBy]);
            return { status: 'OK', data: result };
        } catch (err) {
            console.error('createProjectTracker error:', err);
            // Handle duplicate error (unique constraint on PipelineId)
            if (err.msgError && err.msgError.code === 'ER_DUP_ENTRY') {
                return { status: 'ERROR', code: 409, message: 'Project tracker sudah ada untuk pipeline ini' };
            }
            // Handle SIGNAL from stored procedure (duplicate check inside SP)
            if (err.msgError && err.msgError.sqlState === '45000') {
                return { status: 'ERROR', code: 409, message: err.msgError.sqlMessage || 'Project tracker sudah ada untuk pipeline ini' };
            }
            return { status: 'ERROR', message: err.msgError || err.message || 'Failed to create project tracker' };
        }
    }

    /**
     * Get project tracker list with pagination, search, and role-based access
     */
    async getProjectTrackerList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 5, 6 can access
            if (![1, 5, 6].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';

            // Build dynamic query conditions
            let conditions = '';
            let params = [];

            // Search by owner name or outlet name
            if (search) {
                conditions += ' AND (a5.DisplayName LIKE ? OR a4.OutletName LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            // Count total
            const countQuery = `SELECT COUNT(DISTINCT a6.ProjectTrackerId) AS total
                FROM sales_pipeline a1
                JOIN master_lease_agreement a2 ON a1.PipelineId = a2.PipelineId
                JOIN (SELECT OutletId, AgreementId, COUNT(DeviceId) AS TotalDevice FROM device_controller GROUP BY OutletId, AgreementId) a3 ON a2.AgreementId = a3.AgreementId
                JOIN outlet a4 ON a3.OutletId = a4.OutletId
                JOIN users a5 ON a4.OwnerId = a5.UserId AND a5.IsActive = 1
                JOIN project_tracker a6 ON a1.PipelineId = a6.PipelineId AND a5.UserId = a6.OwnerId
                WHERE 1=1${conditions}`;
            const [countResult] = await esql.sqlQuery(countQuery, params);
            const total = countResult?.total || 0;

            // Get paginated list
            const listQuery = `${query.projectTrackerList}${conditions} ORDER BY a6.CreatedAt DESC LIMIT ? OFFSET ?`;
            const trackers = await esql.sqlQuery(listQuery, [...params, limit, offset]);

            return res.json({
                status: 'OK',
                data: {
                    trackers,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                        hasNext: page < Math.ceil(total / limit),
                        hasPrev: page > 1
                    }
                }
            });
        } catch (err) {
            console.error('getProjectTrackerList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get project tracker detail with owner, outlet, device info and milestone history
     */
    async getProjectTrackerDetail(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });

        try {
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 5, 6 can access
            if (![1, 5, 6].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const projectTrackerId = req.query.project_tracker_id;
            if (!projectTrackerId) return res.json({ status: 'ERROR', message: 'project_tracker_id wajib' });

            let esql = new Esql();

            // Get project tracker detail (may return multiple rows due to JOINs with devices)
            const detailRows = await esql.sqlQuery(query.projectTrackerDetail, [projectTrackerId]);

            if (!detailRows || detailRows.length === 0) {
                return res.status(404).json({ status: 'ERROR', message: 'Data tidak ditemukan' });
            }

            // Extract base info from first row
            const firstRow = detailRows[0];
            const trackerInfo = {
                ProjectTrackerId: firstRow.ProjectTrackerId,
                PipelineId: firstRow.PipelineId,
                OwnerId: firstRow.OwnerId,
                CurrentMilestone: firstRow.CurrentMilestone,
                ApprovedBy: firstRow.ApprovedBy,
                CreatedAt: firstRow.CreatedAt,
                UpdatedAt: firstRow.UpdatedAt,
                owner: {
                    name: firstRow.OwnerName,
                    phone: firstRow.OwnerPhone,
                    email: firstRow.OwnerEmail
                },
                outlet: {
                    OutletId: firstRow.OutletId,
                    OutletName: firstRow.OutletName,
                    OutletCode: firstRow.OutletCode,
                    Status: firstRow.OutletStatus
                },
                devices: []
            };

            // Collect unique devices from rows
            const deviceIds = new Set();
            for (const row of detailRows) {
                if (row.DeviceId && !deviceIds.has(row.DeviceId)) {
                    deviceIds.add(row.DeviceId);
                    trackerInfo.devices.push({
                        DeviceId: row.DeviceId,
                        DeviceCode: row.DeviceCode,
                        DeviceName: row.DeviceName,
                        DeviceType: row.DeviceType,
                        Status: row.DeviceStatus
                    });
                }
            }

            // Get milestone history
            const milestones = await esql.sqlQuery(query.projectTrackerMilestones, [projectTrackerId]);
            trackerInfo.milestones = milestones;

            return res.json({ status: 'OK', data: trackerInfo });
        } catch (err) {
            console.error('getProjectTrackerDetail error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Advance project milestone (RoleId 1 and 5 only, reject RoleId 6)
     */
    async advanceMilestone(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });

        try {
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1 and 5 can advance milestone
            if (![1, 5].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            let esql = new Esql();
            const { project_tracker_id, new_milestone, notes } = req.body;

            if (!project_tracker_id) {
                return res.json({ status: 'ERROR', message: 'project_tracker_id wajib' });
            }

            if (!new_milestone) {
                return res.json({ status: 'ERROR', message: 'new_milestone wajib' });
            }

            // Validate milestone value
            const validMilestones = ['perakitan', 'instalasi'];
            if (!validMilestones.includes(new_milestone)) {
                return res.status(400).json({ status: 'ERROR', message: 'Transisi milestone tidak valid' });
            }

            // Call stored procedure to advance milestone
            const result = await esql.sqlProcedure(query.SP_AdvanceProjectMilestone, [
                project_tracker_id, new_milestone, userData.user_id
            ]);

            // When milestone advances to "perakitan", activate all devices for this owner
            if (new_milestone === 'perakitan') {
                try {
                    const [pt] = await esql.sqlQuery('SELECT OwnerId FROM project_tracker WHERE ProjectTrackerId = ?', [project_tracker_id]);
                    if (pt && pt.OwnerId) {
                        await esql.sqlQuery(
                            `UPDATE device_controller dc
                             JOIN outlet o ON dc.OutletId = o.OutletId
                             SET dc.IsActive = 1
                             WHERE o.OwnerId = ? AND dc.IsActive = 0`,
                            [pt.OwnerId]
                        );
                    }
                } catch (activateErr) {
                    console.error('Device activation error:', activateErr.message || activateErr);
                }
            }

            return res.json({ status: 'OK', message: 'Milestone berhasil diupdate', data: result });
        } catch (err) {
            console.error('advanceMilestone error:', err);
            // Handle SIGNAL from stored procedure (invalid transition)
            if (err.msgError && err.msgError.sqlState === '45000') {
                return res.status(400).json({ status: 'ERROR', message: err.msgError.sqlMessage || 'Transisi milestone tidak valid' });
            }
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }
}

module.exports = ProjectTrackerModel;
