const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');
const query = require('../query/query.js');

class PartnerModel {
    constructor(token) {
        this.token = token;
    }

    _getUserData() {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
        return JSON.parse(decoded.gen);
    }

    /**
     * Get partner list with pagination, MOUStatus filter, search, and role-based scoping
     */
    async getPartnerList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 6, 8 can access
            if (![1, 6, 8].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            // Admin Partner (RoleId=8) sees only own partner
            if (roleId === 8) {
                const partnerData = await esql.sqlQuery(query.partnerByUser, [userData.user_id]);
                if (!partnerData || partnerData.length === 0) {
                    return res.json({ status: 'OK', data: { partners: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } } });
                }
                return res.json({ status: 'OK', data: { partners: partnerData, pagination: { page: 1, limit: 10, total: partnerData.length, totalPages: 1, hasNext: false, hasPrev: false } } });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const mouStatus = req.query.status || '';
            const search = req.query.search || '';

            // Build dynamic query conditions
            let conditions = '';
            let params = [];

            // MOUStatus filter
            if (mouStatus) {
                conditions += ' AND MOUStatus = ?';
                params.push(mouStatus);
            }

            // Search by CompanyName or ContactPerson
            if (search) {
                conditions += ' AND (CompanyName LIKE ? OR ContactPerson LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            // Count total
            const countQuery = `SELECT COUNT(*) AS total FROM partners WHERE 1=1${conditions}`;
            const [countResult] = await esql.sqlQuery(countQuery, params);
            const total = countResult?.total || 0;

            // Get paginated list
            const listQuery = `${query.partnerList}${conditions} ORDER BY CreatedAt DESC LIMIT ? OFFSET ?`;
            const partners = await esql.sqlQuery(listQuery, [...params, limit, offset]);

            return res.json({
                status: 'OK',
                data: {
                    partners,
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
            console.error('getPartnerList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get partner detail by ID with role-based access check and associated lease agreements
     */
    async getPartnerDetail(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 8 can access
            if (![1, 8].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const partnerId = req.query.partner_id;
            if (!partnerId) return res.json({ status: 'ERROR', message: 'partner_id wajib diisi' });

            // Admin Partner can only view own partner
            if (roleId === 8) {
                const userPartner = await esql.sqlQuery(query.partnerByUser, [userData.user_id]);
                if (!userPartner || userPartner.length === 0 || userPartner[0].PartnerId !== parseInt(partnerId)) {
                    return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
                }
            }

            const [partner] = await esql.sqlQuery(query.partnerById, [partnerId]);
            if (!partner) {
                return res.status(404).json({ status: 'ERROR', message: 'Partner tidak ditemukan' });
            }

            // Get associated lease agreements
            const leaseAgreements = await esql.sqlQuery(query.leaseAgreementsByPartner, [partnerId]);

            return res.json({ status: 'OK', data: { ...partner, leaseAgreements } });
        } catch (err) {
            console.error('getPartnerDetail error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Create a new partner (Super Admin only - RoleId=1)
     */
    async createPartner(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can create partners
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { CompanyName, ContactPerson, Phone, Email, Address, MOUDate, MOUStatus, CooperationType, Notes } = req.body;

            // Mandatory field validation
            if (!CompanyName || !CompanyName.trim()) return res.json({ status: 'ERROR', message: 'CompanyName wajib diisi' });
            if (!ContactPerson || !ContactPerson.trim()) return res.json({ status: 'ERROR', message: 'ContactPerson wajib diisi' });
            if (!Phone || !Phone.trim()) return res.json({ status: 'ERROR', message: 'Phone wajib diisi' });
            if (!Email || !Email.trim()) return res.json({ status: 'ERROR', message: 'Email wajib diisi' });
            if (!Address || !Address.trim()) return res.json({ status: 'ERROR', message: 'Address wajib diisi' });
            if (!MOUDate) return res.json({ status: 'ERROR', message: 'MOUDate wajib diisi' });
            if (!MOUStatus || !MOUStatus.trim()) return res.json({ status: 'ERROR', message: 'MOUStatus wajib diisi' });
            if (!CooperationType || !CooperationType.trim()) return res.json({ status: 'ERROR', message: 'CooperationType wajib diisi' });

            const result = await esql.sqlProcedure(query.SP_CreatePartner, [
                CompanyName.trim(), ContactPerson.trim(), Phone.trim(), Email.trim(),
                Address.trim(), MOUDate, MOUStatus.trim(), CooperationType.trim(), Notes || null
            ]);

            return res.json({ status: 'OK', message: 'Partner berhasil dibuat', data: result });
        } catch (err) {
            console.error('createPartner error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Update an existing partner (Super Admin only - RoleId=1)
     */
    async updatePartner(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can update partners
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { PartnerId, CompanyName, ContactPerson, Phone, Email, Address, MOUDate, MOUStatus, CooperationType, Notes } = req.body;

            if (!PartnerId) return res.json({ status: 'ERROR', message: 'PartnerId wajib diisi' });

            // Mandatory field validation
            if (!CompanyName || !CompanyName.trim()) return res.json({ status: 'ERROR', message: 'CompanyName wajib diisi' });
            if (!ContactPerson || !ContactPerson.trim()) return res.json({ status: 'ERROR', message: 'ContactPerson wajib diisi' });
            if (!Phone || !Phone.trim()) return res.json({ status: 'ERROR', message: 'Phone wajib diisi' });
            if (!Email || !Email.trim()) return res.json({ status: 'ERROR', message: 'Email wajib diisi' });
            if (!Address || !Address.trim()) return res.json({ status: 'ERROR', message: 'Address wajib diisi' });
            if (!MOUDate) return res.json({ status: 'ERROR', message: 'MOUDate wajib diisi' });
            if (!MOUStatus || !MOUStatus.trim()) return res.json({ status: 'ERROR', message: 'MOUStatus wajib diisi' });
            if (!CooperationType || !CooperationType.trim()) return res.json({ status: 'ERROR', message: 'CooperationType wajib diisi' });

            // Check partner exists
            const [existing] = await esql.sqlQuery(query.partnerById, [PartnerId]);
            if (!existing) {
                return res.status(404).json({ status: 'ERROR', message: 'Partner tidak ditemukan' });
            }

            const result = await esql.sqlProcedure(query.SP_UpdatePartner, [
                PartnerId, CompanyName.trim(), ContactPerson.trim(), Phone.trim(), Email.trim(),
                Address.trim(), MOUDate, MOUStatus.trim(), CooperationType.trim(), Notes || null
            ]);

            return res.json({ status: 'OK', message: 'Partner berhasil diupdate', data: result });
        } catch (err) {
            console.error('updatePartner error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Delete a partner with associated user check (Super Admin only - RoleId=1)
     */
    async deletePartner(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can delete partners
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { PartnerId, confirmed } = req.body;
            if (!PartnerId) return res.json({ status: 'ERROR', message: 'PartnerId wajib diisi' });

            // Check partner exists
            const [existing] = await esql.sqlQuery(query.partnerById, [PartnerId]);
            if (!existing) {
                return res.status(404).json({ status: 'ERROR', message: 'Partner tidak ditemukan' });
            }

            // Check for associated users
            const associatedUsers = await esql.sqlQuery(
                'SELECT UserId, DisplayName, MobilePhone FROM users WHERE PartnerId = ? AND IsActive = 1',
                [PartnerId]
            );

            if (associatedUsers && associatedUsers.length > 0 && !confirmed) {
                return res.json({
                    status: 'ERROR',
                    message: 'Partner memiliki user terkait',
                    data: { users: associatedUsers }
                });
            }

            const result = await esql.sqlProcedure(query.SP_DeletePartner, [PartnerId]);
            return res.json({ status: 'OK', message: 'Partner berhasil dihapus', data: result });
        } catch (err) {
            console.error('deletePartner error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get own partner for Admin Partner (RoleId=8)
     */
    async getMyPartner(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Admin Partner (RoleId=8) can access this endpoint
            if (userData.role_id !== 8) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const partnerData = await esql.sqlQuery(query.partnerByUser, [userData.user_id]);
            if (!partnerData || partnerData.length === 0) {
                return res.status(404).json({ status: 'ERROR', message: 'Partner tidak ditemukan' });
            }

            // Get associated lease agreements
            const leaseAgreements = await esql.sqlQuery(query.leaseAgreementsByPartner, [partnerData[0].PartnerId]);

            return res.json({ status: 'OK', data: { ...partnerData[0], leaseAgreements } });
        } catch (err) {
            console.error('getMyPartner error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get sales partner list with role-based scoping
     * RoleId=8 sees only own partner's entries, RoleId=1 sees all
     */
    async getSalesPartnerList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 8 can access
            if (![1, 8].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            let conditions = '';
            let params = [];

            // Admin Partner (RoleId=8) sees only own partner's entries
            if (roleId === 8) {
                const userPartner = await esql.sqlQuery(query.partnerByUser, [userData.user_id]);
                if (!userPartner || userPartner.length === 0) {
                    return res.json({ status: 'OK', data: { salesPartners: [], pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } } });
                }
                conditions += ' AND sp.PartnerId = ?';
                params.push(userPartner[0].PartnerId);
            }

            // Count total
            const countQuery = `SELECT COUNT(*) AS total FROM sales_partner sp JOIN partners p ON sp.PartnerId = p.PartnerId WHERE 1=1${conditions}`;
            const [countResult] = await esql.sqlQuery(countQuery, params);
            const total = countResult?.total || 0;

            // Get paginated list
            const listQuery = `${query.salesPartnerList}${conditions} ORDER BY sp.CreatedAt DESC LIMIT ? OFFSET ?`;
            const salesPartners = await esql.sqlQuery(listQuery, [...params, limit, offset]);

            return res.json({
                status: 'OK',
                data: {
                    salesPartners,
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
            console.error('getSalesPartnerList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get sales partner detail by ID
     */
    async getSalesPartnerDetail(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 8 can access
            if (![1, 8].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const salesPartnerId = req.query.sales_partner_id;
            if (!salesPartnerId) return res.json({ status: 'ERROR', message: 'sales_partner_id wajib diisi' });

            const detailQuery = `SELECT sp.*, p.CompanyName AS PartnerName, u.DisplayName AS CreatorName FROM sales_partner sp JOIN partners p ON sp.PartnerId = p.PartnerId LEFT JOIN users u ON sp.CreatedBy = u.UserId WHERE sp.SalesPartnerId = ?`;
            const [detail] = await esql.sqlQuery(detailQuery, [salesPartnerId]);

            if (!detail) {
                return res.status(404).json({ status: 'ERROR', message: 'Sales Partner tidak ditemukan' });
            }

            // Admin Partner (RoleId=8) can only view own partner's entries
            if (roleId === 8) {
                const userPartner = await esql.sqlQuery(query.partnerByUser, [userData.user_id]);
                if (!userPartner || userPartner.length === 0 || userPartner[0].PartnerId !== detail.PartnerId) {
                    return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
                }
            }

            return res.json({ status: 'OK', data: detail });
        } catch (err) {
            console.error('getSalesPartnerDetail error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Create a sales partner entry with mandatory field validation
     * Auto-sets PartnerId from creator's association for RoleId=8
     */
    async createSalesPartner(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 8 can create
            if (![1, 8].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { ProspectName, Phone, Address, BusinessType, LeadStatus, Notes, PartnerId } = req.body;

            // Mandatory field validation
            if (!ProspectName || !ProspectName.trim()) return res.json({ status: 'ERROR', message: 'ProspectName wajib diisi' });
            if (!Phone || !Phone.trim()) return res.json({ status: 'ERROR', message: 'Phone wajib diisi' });

            let resolvedPartnerId = PartnerId;

            // For Admin Partner (RoleId=8), auto-set PartnerId from user's association
            if (roleId === 8) {
                const userPartner = await esql.sqlQuery(query.partnerByUser, [userData.user_id]);
                if (!userPartner || userPartner.length === 0) {
                    return res.status(400).json({ status: 'ERROR', message: 'Partner tidak valid' });
                }
                resolvedPartnerId = userPartner[0].PartnerId;
            } else {
                // Super Admin must provide PartnerId
                if (!resolvedPartnerId) return res.json({ status: 'ERROR', message: 'PartnerId wajib diisi' });
                // Validate PartnerId exists
                const [partnerCheck] = await esql.sqlQuery(query.partnerById, [resolvedPartnerId]);
                if (!partnerCheck) {
                    return res.status(400).json({ status: 'ERROR', message: 'Partner tidak valid' });
                }
            }

            const result = await esql.sqlProcedure(query.SP_CreateSalesPartner, [
                resolvedPartnerId, userData.user_id, ProspectName.trim(), Phone.trim(),
                Address ? Address.trim() : null, BusinessType ? BusinessType.trim() : null, Notes || null
            ]);

            return res.json({ status: 'OK', message: 'Sales Partner berhasil dibuat', data: result });
        } catch (err) {
            console.error('createSalesPartner error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get lease agreement list with pagination (Super Admin only - RoleId=1)
     */
    async getLeaseAgreementList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can access
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            // Count total
            const countQuery = `SELECT COUNT(*) AS total FROM master_lease_agreement mla JOIN partners p ON mla.PartnerId = p.PartnerId WHERE 1=1`;
            const [countResult] = await esql.sqlQuery(countQuery, []);
            const total = countResult?.total || 0;

            // Get paginated list
            const listQuery = `${query.leaseAgreementList} ORDER BY mla.CreatedAt DESC LIMIT ? OFFSET ?`;
            const agreements = await esql.sqlQuery(listQuery, [limit, offset]);

            return res.json({
                status: 'OK',
                data: {
                    agreements,
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
            console.error('getLeaseAgreementList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Create a lease agreement with validation (Super Admin only - RoleId=1)
     * NomorAgreement is auto-generated with format: MLA-YYYY-XXX
     */
    async createLeaseAgreement(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can create
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { PartnerId, TanggalMulai, TanggalBerakhir, StatusAgreement, PipelineId, Notes } = req.body;

            // Mandatory field validation
            if (!PartnerId) return res.json({ status: 'ERROR', message: 'PartnerId wajib diisi' });
            if (!TanggalMulai) return res.json({ status: 'ERROR', message: 'TanggalMulai wajib diisi' });
            if (!TanggalBerakhir) return res.json({ status: 'ERROR', message: 'TanggalBerakhir wajib diisi' });

            // Validate TanggalBerakhir >= TanggalMulai
            if (new Date(TanggalBerakhir) < new Date(TanggalMulai)) {
                return res.json({ status: 'ERROR', message: 'TanggalBerakhir harus >= TanggalMulai' });
            }

            // Validate PartnerId exists
            const [partnerCheck] = await esql.sqlQuery(query.partnerById, [PartnerId]);
            if (!partnerCheck) {
                return res.status(400).json({ status: 'ERROR', message: 'Partner tidak valid' });
            }

            // Auto-generate NomorAgreement: MLA-YYYY-XXX
            const currentYear = new Date().getFullYear();
            const [lastAgreement] = await esql.sqlQuery(
                `SELECT NomorAgreement FROM master_lease_agreement WHERE NomorAgreement LIKE ? ORDER BY AgreementId DESC LIMIT 1`,
                [`MLA-${currentYear}-%`]
            );

            let nextNumber = 1;
            if (lastAgreement && lastAgreement.NomorAgreement) {
                const parts = lastAgreement.NomorAgreement.split('-');
                const lastNum = parseInt(parts[2]) || 0;
                nextNumber = lastNum + 1;
            }

            const NomorAgreement = `MLA-${currentYear}-${String(nextNumber).padStart(3, '0')}`;

            const result = await esql.sqlProcedure(query.SP_CreateLeaseAgreement, [
                PartnerId, NomorAgreement, TanggalMulai, TanggalBerakhir,
                StatusAgreement || 'active', PipelineId || null, Notes || null
            ]);

            return res.json({ status: 'OK', message: 'Lease Agreement berhasil dibuat', data: { ...result, NomorAgreement } });
        } catch (err) {
            console.error('createLeaseAgreement error:', err);
            // Handle duplicate entry error from DB
            if (err.msgError && err.msgError.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ status: 'ERROR', message: 'Nomor agreement sudah ada' });
            }
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Update a lease agreement with validation (Super Admin only - RoleId=1)
     */
    async updateLeaseAgreement(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can update
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { AgreementId, PartnerId, NomorAgreement, TanggalMulai, TanggalBerakhir, StatusAgreement, PipelineId, Notes } = req.body;

            if (!AgreementId) return res.json({ status: 'ERROR', message: 'AgreementId wajib diisi' });
            if (!PartnerId) return res.json({ status: 'ERROR', message: 'PartnerId wajib diisi' });
            if (!NomorAgreement || !NomorAgreement.trim()) return res.json({ status: 'ERROR', message: 'NomorAgreement wajib diisi' });
            if (!TanggalMulai) return res.json({ status: 'ERROR', message: 'TanggalMulai wajib diisi' });
            if (!TanggalBerakhir) return res.json({ status: 'ERROR', message: 'TanggalBerakhir wajib diisi' });

            // Validate TanggalBerakhir >= TanggalMulai
            if (new Date(TanggalBerakhir) < new Date(TanggalMulai)) {
                return res.json({ status: 'ERROR', message: 'TanggalBerakhir harus >= TanggalMulai' });
            }

            // Validate PartnerId exists
            const [partnerCheck] = await esql.sqlQuery(query.partnerById, [PartnerId]);
            if (!partnerCheck) {
                return res.status(400).json({ status: 'ERROR', message: 'Partner tidak valid' });
            }

            // Check duplicate NomorAgreement (exclude current record)
            const [dupCheck] = await esql.sqlQuery(
                'SELECT AgreementId FROM master_lease_agreement WHERE NomorAgreement = ? AND AgreementId != ?',
                [NomorAgreement.trim(), AgreementId]
            );
            if (dupCheck) {
                return res.status(409).json({ status: 'ERROR', message: 'Nomor agreement sudah ada' });
            }

            const result = await esql.sqlProcedure(query.SP_UpdateLeaseAgreement, [
                AgreementId, PartnerId, NomorAgreement.trim(), TanggalMulai, TanggalBerakhir,
                StatusAgreement || 'active', PipelineId || null, Notes || null
            ]);

            return res.json({ status: 'OK', message: 'Lease Agreement berhasil diupdate', data: result });
        } catch (err) {
            console.error('updateLeaseAgreement error:', err);
            if (err.msgError && err.msgError.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ status: 'ERROR', message: 'Nomor agreement sudah ada' });
            }
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Update a sales partner entry
     * Access: RoleId 1 (Super Admin), 8 (Admin Partner)
     */
    async updateSalesPartner(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const roleId = userData.role_id;

            // Role-based access: only RoleId 1, 8 can update
            if (![1, 8].includes(roleId)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { SalesPartnerId, ProspectName, Phone, Address, BusinessType, LeadStatus, Notes } = req.body;

            // Mandatory field validation
            if (!SalesPartnerId) return res.json({ status: 'ERROR', message: 'SalesPartnerId wajib diisi' });
            if (!ProspectName || !ProspectName.trim()) return res.json({ status: 'ERROR', message: 'ProspectName wajib diisi' });
            if (!Phone || !Phone.trim()) return res.json({ status: 'ERROR', message: 'Phone wajib diisi' });

            // Validate LeadStatus
            const validStatuses = ['new', 'contacted', 'negotiation', 'closed_won', 'closed_lost'];
            if (LeadStatus && !validStatuses.includes(LeadStatus)) {
                return res.json({ status: 'ERROR', message: 'LeadStatus tidak valid' });
            }

            // Check sales partner exists
            const [existing] = await esql.sqlQuery(
                'SELECT sp.* FROM sales_partner sp WHERE sp.SalesPartnerId = ?',
                [SalesPartnerId]
            );
            if (!existing) {
                return res.status(404).json({ status: 'ERROR', message: 'Sales Partner tidak ditemukan' });
            }

            // Admin Partner (RoleId=8) can only update own partner's entries
            if (roleId === 8) {
                const userPartner = await esql.sqlQuery(query.partnerByUser, [userData.user_id]);
                if (!userPartner || userPartner.length === 0 || userPartner[0].PartnerId !== existing.PartnerId) {
                    return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
                }
            }

            // Update sales_partner
            await esql.sqlQuery(
                `UPDATE sales_partner SET ProspectName = ?, Phone = ?, Address = ?, BusinessType = ?, LeadStatus = ?, Notes = ? WHERE SalesPartnerId = ?`,
                [
                    ProspectName.trim(),
                    Phone.trim(),
                    Address ? Address.trim() : null,
                    BusinessType ? BusinessType.trim() : null,
                    LeadStatus || 'new',
                    Notes || null,
                    SalesPartnerId
                ]
            );

            return res.json({ status: 'OK', message: 'Sales Partner berhasil diupdate' });
        } catch (err) {
            console.error('updateSalesPartner error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Delete a lease agreement (Super Admin only - RoleId=1)
     */
    async deleteLeaseAgreement(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can delete
            if (userData.role_id !== 1) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { AgreementId } = req.body;
            if (!AgreementId) return res.json({ status: 'ERROR', message: 'AgreementId wajib diisi' });

            const result = await esql.sqlProcedure(query.SP_DeleteLeaseAgreement, [AgreementId]);
            return res.json({ status: 'OK', message: 'Lease Agreement berhasil dihapus', data: result });
        } catch (err) {
            console.error('deleteLeaseAgreement error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }
}

module.exports = PartnerModel;
