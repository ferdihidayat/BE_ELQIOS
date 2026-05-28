const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');
const query = require('../query/query.js');
const ProjectTrackerModel = require('./project_tracker.js');

class SalesPipelineModel {
    constructor(token) {
        this.token = token;
    }

    _getUserData() {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
        return JSON.parse(decoded.gen);
    }

    /**
     * Create a new pipeline record when an owner (RoleId=3) is created
     * @param {number} ownerId - The newly created owner's UserId
     * @param {number} createdBy - The Admin/Sales UserId who created the owner
     */
    async createPipeline(ownerId, createdBy) {
        try {
            let esql = new Esql();
            const result = await esql.sqlProcedure(query.SP_CreateSalesPipeline, [ownerId, createdBy]);
            return { status: 'OK', data: result };
        } catch (err) {
            console.error('createPipeline error:', err);
            return { status: 'ERROR', message: err.msgError || err.message || 'Failed to create pipeline' };
        }
    }

    /**
     * Get pipeline list with pagination, milestone filter, search, and role-based scoping
     */
    async getPipelineList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 2, 6 can access
            if (![1, 2, 6].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const milestone = req.query.milestone || '';
            const search = req.query.search || '';

            // Build dynamic query based on pipelineList base query
            let conditions = '';
            let params = [];

            // Milestone filter
            if (milestone) {
                conditions += ' AND sp.CurrentMilestone = ?';
                params.push(milestone);
            }

            // Search by owner name or phone
            if (search) {
                conditions += ' AND (u_owner.DisplayName LIKE ? OR u_owner.MobilePhone LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            // Role-based scoping: Sales (RoleId=6) sees only own pipelines
            if (parseInt(roleId) === 6) {
                conditions += ' AND sp.CreatedBy = ?';
                params.push(userData.user_id);
            }

            // Count total
            const countQuery = `SELECT COUNT(DISTINCT sp.PipelineId) AS total FROM sales_pipeline sp
                JOIN users u_owner ON sp.OwnerId = u_owner.UserId
                LEFT JOIN users u_creator ON sp.CreatedBy = u_creator.UserId
                WHERE 1=1${conditions}`;
            const [countResult] = await esql.sqlQuery(countQuery, params);
            const total = countResult?.total || 0;

            // Get paginated list (use GROUP BY to avoid duplicates from composite key)
            const listQuery = `${query.pipelineList}${conditions} GROUP BY sp.PipelineId ORDER BY sp.CreatedAt DESC LIMIT ? OFFSET ?`;
            const pipelines = await esql.sqlQuery(listQuery, [...params, limit, offset]);

            return res.json({
                status: 'OK',
                data: {
                    pipelines,
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
            console.error('getPipelineList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get pipeline detail by owner ID (used internally and for detail endpoint)
     * @param {number} ownerId
     */
    async getPipelineByOwner(ownerId) {
        try {
            let esql = new Esql();
            const [pipeline] = await esql.sqlQuery(query.pipelineByOwner, [ownerId]);
            if (!pipeline) return { status: 'ERROR', message: 'Pipeline not found' };

            // Get milestones history
            const milestones = await esql.sqlQuery(query.pipelineMilestones, [pipeline.PipelineId]);

            return { status: 'OK', data: { ...pipeline, milestones } };
        } catch (err) {
            console.error('getPipelineByOwner error:', err);
            return { status: 'ERROR', message: err.msgError || err.message || 'Failed to get pipeline' };
        }
    }

    async getPipelineById(pipelineId) {
        try {
            let esql = new Esql();
            const [pipeline] = await esql.sqlQuery('SELECT * FROM sales_pipeline WHERE PipelineId = ?', [pipelineId]);
            if (!pipeline) return { status: 'ERROR', message: 'Pipeline not found' };

            // Get milestones history
            const milestones = await esql.sqlQuery(query.pipelineMilestones, [pipeline.PipelineId]);

            return { status: 'OK', data: { ...pipeline, milestones } };
        } catch (err) {
            console.error('getPipelineById error:', err);
            return { status: 'ERROR', message: err.msgError || err.message || 'Failed to get pipeline' };
        }
    }

    /**
     * Get pipeline detail endpoint (req/res pattern)
     */
    async getPipelineDetail(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 2, 6 can access
            if (![1, 2, 6].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const ownerId = req.query.owner_id;
            const pipelineId = req.query.pipeline_id;
            if (!ownerId) return res.json({ status: 'ERROR', message: 'owner_id wajib' });

            let result;
            if (pipelineId) {
                // Fetch specific pipeline by ID
                result = await this.getPipelineById(pipelineId);
            } else {
                // Fallback: fetch latest pipeline by owner
                result = await this.getPipelineByOwner(ownerId);
            }

            // Sales can only see own pipelines
            if (roleId === 6 && result.status === 'OK' && result.data.CreatedBy !== userData.user_id) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            return res.json(result);
        } catch (err) {
            console.error('getPipelineDetail error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Update pipeline milestone (called internally from outlet/device creation flows)
     * @param {number} ownerId - The owner whose pipeline to update
     * @param {string} milestoneName - The milestone name (outlet_created, device_created, approved)
     * @param {number} completedBy - The UserId who triggered the milestone
     */
    async updateMilestone(ownerId, milestoneName, completedBy) {
        try {
            let esql = new Esql();
            const result = await esql.sqlProcedure(query.SP_UpdatePipelineMilestone, [ownerId, milestoneName, completedBy]);
            return { status: 'OK', data: result };
        } catch (err) {
            console.error('updateMilestone error:', err);
            return { status: 'ERROR', message: err.msgError || err.message || 'Failed to update milestone' };
        }
    }

    /**
     * Get pending approvals list (Super Admin only)
     */
    async getPendingApprovals(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can access approvals
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            let esql = new Esql();
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            // Count total pending
            const [countResult] = await esql.sqlQuery(
                `SELECT COUNT(*) AS total FROM sales_pipeline_approval WHERE Status = 'pending'`, []
            );
            const total = countResult?.total || 0;

            // Get paginated pending approvals
            const approvals = await esql.sqlQuery(
                `${query.pendingApprovals} LIMIT ? OFFSET ?`, [limit, offset]
            );

            return res.json({
                status: 'OK',
                data: {
                    approvals,
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
            console.error('getPendingApprovals error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Approve an entity (outlet or device) - Super Admin only
     * Sets IsActive=1 on the entity and records approval
     */
    async approveEntity(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can approve
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            let esql = new Esql();
            const { approval_id } = req.body;

            if (!approval_id) {
                return res.json({ status: 'ERROR', message: 'approval_id wajib' });
            }

            // Get approval record to determine entity type and id
            const [approval] = await esql.sqlQuery(
                'SELECT * FROM sales_pipeline_approval WHERE ApprovalId = ? AND Status = ?',
                [approval_id, 'pending']
            );

            if (!approval) {
                return res.status(404).json({ status: 'ERROR', message: 'Approval request not found or already processed' });
            }

            // Call stored procedure to approve
            const result = await esql.sqlProcedure(query.SP_ApprovePipelineEntity, [
                approval_id, userData.user_id, approval.EntityType
            ]);

            // Set IsActive=1 on the entity
            if (approval.EntityType === 'outlet') {
                await esql.sqlQuery('UPDATE outlet SET IsActive = 1 WHERE OutletId = ?', [approval.EntityId]);
            }
            // Note: Device stays IsActive=0 until milestone "perakitan" in Project Tracker

            // Check if all approvals for this pipeline are now approved → advance to "approved" milestone
            const pendingCount = await esql.sqlQuery(
                `SELECT COUNT(*) AS cnt FROM sales_pipeline_approval WHERE PipelineId = ? AND Status = 'pending'`,
                [approval.PipelineId]
            );
            if (pendingCount[0]?.cnt === 0) {
                // All items approved, get the pipeline details
                const [pipeline] = await esql.sqlQuery(
                    'SELECT OwnerId, CurrentMilestone FROM sales_pipeline WHERE PipelineId = ?', [approval.PipelineId]
                );
                if (pipeline) {
                    // Validate current milestone is device_created before proceeding
                    if (pipeline.CurrentMilestone !== 'device_created') {
                        return res.json({ status: 'OK', message: 'Entity berhasil diapprove' });
                    }

                    // Create project tracker before updating pipeline milestone
                    const projectTrackerModel = new ProjectTrackerModel(this.token);
                    const ptResult = await projectTrackerModel.createProjectTracker(
                        approval.PipelineId, pipeline.OwnerId, userData.user_id
                    );

                    if (ptResult.status === 'OK') {
                        // Project tracker created successfully, now update pipeline milestone
                        await this.updateMilestone(pipeline.OwnerId, 'approved', userData.user_id);
                    } else if (ptResult.code === 409) {
                        // Duplicate project tracker — pipeline was already approved previously
                        // Handle gracefully: still update milestone to approved
                        await this.updateMilestone(pipeline.OwnerId, 'approved', userData.user_id);
                    } else {
                        // Project tracker creation failed — do NOT update pipeline milestone
                        console.error('Project tracker creation failed:', ptResult.message);
                        return res.status(500).json({
                            status: 'ERROR',
                            message: ptResult.message || 'Gagal membuat project tracker'
                        });
                    }
                }
            }

            return res.json({ status: 'OK', message: 'Entity berhasil diapprove' });
        } catch (err) {
            console.error('approveEntity error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Approve a pipeline directly (Super Admin only)
     * Validates milestone is device_created, creates project tracker, updates milestone to approved
     */
    async approvePipeline(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can approve pipeline
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            let esql = new Esql();
            const { owner_id } = req.body;

            if (!owner_id) {
                return res.json({ status: 'ERROR', message: 'owner_id wajib' });
            }

            // Get pipeline for this owner
            const [pipeline] = await esql.sqlQuery(query.pipelineByOwner, [owner_id]);
            if (!pipeline) {
                return res.status(404).json({ status: 'ERROR', message: 'Pipeline tidak ditemukan' });
            }

            // Validate current milestone is device_created
            if (pipeline.CurrentMilestone !== 'device_created') {
                return res.status(400).json({ status: 'ERROR', message: 'Pipeline belum mencapai milestone device_created' });
            }

            // Validate: must have at least one Master Lease Agreement for this pipeline
            const [mla] = await esql.sqlQuery(
                'SELECT AgreementId FROM master_lease_agreement WHERE PipelineId = ? LIMIT 1',
                [pipeline.PipelineId]
            );
            if (!mla) {
                return res.json({ status: 'ERROR', message: 'Tidak dapat approve: Agreement Lease belum dibuat untuk pipeline ini' });
            }

            // Validate: must have at least one device linked to the agreement
            const [deviceCount] = await esql.sqlQuery(
                'SELECT COUNT(*) AS total FROM device_controller WHERE AgreementId = ?',
                [mla.AgreementId]
            );
            if (!deviceCount || deviceCount.total === 0) {
                return res.json({ status: 'ERROR', message: 'Tidak dapat approve: Belum ada device yang terdaftar pada agreement ini' });
            }

            // Create project tracker
            const projectTrackerModel = new ProjectTrackerModel(this.token);
            console.log('approvePipeline - Creating project tracker for PipelineId:', pipeline.PipelineId, 'OwnerId:', pipeline.OwnerId);
            const ptResult = await projectTrackerModel.createProjectTracker(
                pipeline.PipelineId, pipeline.OwnerId, userData.user_id
            );
            console.log('approvePipeline - Project tracker result:', JSON.stringify(ptResult));

            if (ptResult.status === 'OK') {
                // Project tracker created successfully, now update pipeline milestone
                await this.updateMilestone(pipeline.OwnerId, 'approved', userData.user_id);
            } else if (ptResult.code === 409) {
                // Duplicate project tracker — pipeline was already approved previously
                return res.status(409).json({ status: 'ERROR', message: 'Project tracker sudah ada untuk pipeline ini' });
            } else {
                // Project tracker creation failed — do NOT update pipeline milestone
                console.error('approvePipeline - Project tracker creation failed:', ptResult.message);
                return res.status(500).json({
                    status: 'ERROR',
                    message: ptResult.message || 'Gagal membuat project tracker'
                });
            }

            return res.json({ status: 'OK', message: 'Pipeline berhasil diapprove' });
        } catch (err) {
            console.error('approvePipeline error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get agreement by PipelineId
     * Returns the master_lease_agreement linked to a specific pipeline
     */
    async getAgreementByPipeline(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const { PipelineId } = req.body;

            if (!PipelineId) return res.json({ status: 'ERROR', message: 'PipelineId wajib' });

            const [agreement] = await esql.sqlQuery(
                `SELECT mla.AgreementId, mla.AgreementNumber, mla.OwnerId, mla.PartnerId, mla.DeviceCount, 
                    mla.Status, mla.PipelineId,
                    p.CompanyName AS PartnerName,
                    os.StartDate, os.EndDate
                 FROM master_lease_agreement mla
                 LEFT JOIN partners p ON mla.PartnerId = p.PartnerId
                 LEFT JOIN owner_subscription os ON mla.SubscriptionId = os.SubscriptionId
                 WHERE mla.PipelineId = ?`,
                [PipelineId]
            );

            if (!agreement) {
                return res.json({ status: 'OK', data: null });
            }

            return res.json({ status: 'OK', data: agreement });
        } catch (err) {
            console.error('getAgreementByPipeline error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get Pipeline Flow - complete flow view: Sales Tracker → Master Lease Agreement → Project Tracker
     * Super Admin (RoleId=1) only
     */
    async getPipelineFlow(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can access pipeline flow
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            let esql = new Esql();
            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.body.search || '';

            let conditions = '';
            let params = [];

            // Search by owner name
            if (search) {
                conditions += ' AND u.DisplayName LIKE ?';
                params.push(`%${search}%`);
            }

            // Count total
            const countQuery = `SELECT COUNT(DISTINCT sp.PipelineId) AS total
                FROM sales_pipeline sp
                JOIN users u ON sp.OwnerId = u.UserId
                LEFT JOIN master_lease_agreement mla ON mla.PipelineId = sp.PipelineId
                LEFT JOIN project_tracker pt ON pt.PipelineId = sp.PipelineId
                WHERE 1=1${conditions}`;
            const [countResult] = await esql.sqlQuery(countQuery, params);
            const total = countResult?.total || 0;

            // Get paginated pipeline flow data
            const flowQuery = `SELECT sp.PipelineId, sp.SalesTrackerCode, sp.OwnerId, sp.CurrentMilestone, sp.CreatedAt,
                u.DisplayName AS OwnerName,
                mla.AgreementId, mla.AgreementNumber, mla.Status AS AgreementStatus,
                pt.ProjectTrackerId, pt.CurrentMilestone AS ProjectStatus
                FROM sales_pipeline sp
                JOIN users u ON sp.OwnerId = u.UserId
                LEFT JOIN master_lease_agreement mla ON mla.PipelineId = sp.PipelineId
                LEFT JOIN project_tracker pt ON pt.PipelineId = sp.PipelineId
                WHERE 1=1${conditions}
                ORDER BY sp.CreatedAt DESC
                LIMIT ? OFFSET ?`;
            const pipelines = await esql.sqlQuery(flowQuery, [...params, limit, offset]);

            return res.json({
                status: 'OK',
                data: {
                    pipelines,
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
            console.error('getPipelineFlow error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Reject an entity (outlet or device) - Super Admin only
     * Records rejection reason and keeps IsActive=0
     */
    async rejectEntity(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can reject
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            let esql = new Esql();
            const { approval_id, reason } = req.body;

            if (!approval_id) {
                return res.json({ status: 'ERROR', message: 'approval_id wajib' });
            }

            if (!reason || !reason.trim()) {
                return res.status(400).json({ status: 'ERROR', message: 'Rejection reason required' });
            }

            // Verify approval exists and is pending
            const [approval] = await esql.sqlQuery(
                'SELECT * FROM sales_pipeline_approval WHERE ApprovalId = ? AND Status = ?',
                [approval_id, 'pending']
            );

            if (!approval) {
                return res.status(404).json({ status: 'ERROR', message: 'Approval request not found or already processed' });
            }

            // Call stored procedure to reject
            await esql.sqlProcedure(query.SP_RejectPipelineEntity, [
                approval_id, userData.user_id, reason.trim()
            ]);

            return res.json({ status: 'OK', message: 'Entity berhasil ditolak' });
        } catch (err) {
            console.error('rejectEntity error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }
}

module.exports = SalesPipelineModel;
