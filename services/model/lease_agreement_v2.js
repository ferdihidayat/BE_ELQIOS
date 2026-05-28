const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');
const query = require('../query/query.js');

class LeaseAgreementV2Model {
    constructor(token) {
        this.token = token;
    }

    _getUserData() {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
        return JSON.parse(decoded.gen);
    }

    /**
     * Auto-generate NomorAgreement with format MLA-YYYY-XXX
     * Queries the highest existing number for the current year and increments by 1
     * If no existing records for current year, starts at 001
     * @param {Esql} esql - Database entity instance
     * @returns {Promise<string>} Generated AgreementNumber (format: MLA-YYYY-MM-XXX)
     */
    async _generateAgreementNumber(esql) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `MLA-${currentYear}-${currentMonth}`;

        const [lastAgreement] = await esql.sqlQuery(
            `SELECT AgreementNumber FROM master_lease_agreement WHERE AgreementNumber LIKE ? ORDER BY AgreementNumber DESC LIMIT 1`,
            [`${prefix}-%`]
        );

        let nextNumber = 1;
        if (lastAgreement && lastAgreement.AgreementNumber) {
            const parts = lastAgreement.AgreementNumber.split('-');
            const lastNum = parseInt(parts[3]) || 0;
            nextNumber = lastNum + 1;
        }

        return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
    }

    /**
     * Get paginated list of lease agreements with Owner and Partner names
     * Only accessible by Super Admin (RoleId=1)
     */
    async getLeaseAgreementList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) and Sales Admin (RoleId=6) can access
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 10;
            const offset = (page - 1) * limit;

            // Count total records
            const countQuery = `SELECT COUNT(*) AS total FROM master_lease_agreement mla JOIN users u ON mla.OwnerId = u.UserId LEFT JOIN partners p ON mla.PartnerId = p.PartnerId WHERE 1=1`;
            const [countResult] = await esql.sqlQuery(countQuery, []);
            const total = countResult?.total || 0;

            // Get paginated list ordered by CreatedAt DESC
            const listQuery = `${query.leaseAgreementListV2} ORDER BY mla.CreatedAt DESC LIMIT ? OFFSET ?`;
            const agreements = await esql.sqlQuery(listQuery, [limit, offset]);

            // Fetch invoice statuses for all agreements in this page
            if (agreements && agreements.length > 0) {
                const agreementIds = agreements.map(a => a.AgreementId);
                const invoices = await esql.sqlQuery(
                    `SELECT AgreementId, InvoiceId, InvoiceType, PaymentStatus FROM agreement_invoice WHERE AgreementId IN (?)`,
                    [agreementIds]
                );

                // Map invoice data to each agreement
                agreements.forEach(agreement => {
                    const dpInvoice = invoices.find(inv => inv.AgreementId === agreement.AgreementId && inv.InvoiceType === 'down_payment');
                    const settlementInvoice = invoices.find(inv => inv.AgreementId === agreement.AgreementId && inv.InvoiceType === 'settlement');
                    agreement.DpInvoiceId = dpInvoice ? dpInvoice.InvoiceId : null;
                    agreement.DpStatus = dpInvoice ? dpInvoice.PaymentStatus : null;
                    agreement.SettlementInvoiceId = settlementInvoice ? settlementInvoice.InvoiceId : null;
                    agreement.SettlementStatus = settlementInvoice ? settlementInvoice.PaymentStatus : null;
                });
            }

            const totalPages = Math.ceil(total / limit);

            return res.json({
                status: 'OK',
                data: {
                    agreements,
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
            console.error('getLeaseAgreementList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get lease agreement detail by AgreementId with associated price list and incentive data
     * Only accessible by Super Admin (RoleId=1)
     */
    async getLeaseAgreementDetail(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) and Sales Admin (RoleId=6) can access
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { AgreementId } = req.body;

            // Query agreement by AgreementId
            const detailQuery = `${query.leaseAgreementListV2} AND mla.AgreementId = ?`;
            const agreements = await esql.sqlQuery(detailQuery, [AgreementId]);

            if (!agreements || agreements.length === 0) {
                return res.status(404).json({ status: 'ERROR', message: 'Lease agreement tidak ditemukan' });
            }

            // Query associated price list records
            const priceList = await esql.sqlQuery(
                'SELECT * FROM agreement_price_list WHERE AgreementId = ? ORDER BY PriceListId ASC',
                [AgreementId]
            );

            // Query incentive partner data
            const incentivePartnerRows = await esql.sqlQuery(query.incentivePartnerByAgreement, [AgreementId]);
            const incentivePartner = incentivePartnerRows && incentivePartnerRows.length > 0
                ? {
                    AgreementId: incentivePartnerRows[0].AgreementId,
                    IncentiveType: incentivePartnerRows[0].IncentiveType,
                    IncentiveValue: incentivePartnerRows[0].IncentiveValue,
                    PaymentStatus: incentivePartnerRows[0].PaymentStatus || 'unpaid',
                    ContactPerson: incentivePartnerRows[0].ContactPerson || null,
                    Notes: incentivePartnerRows[0].Notes || null
                }
                : null;

            // Query incentive sales data
            const incentiveSalesRows = await esql.sqlQuery(query.incentiveSalesByAgreement, [AgreementId]);
            const incentiveSales = incentiveSalesRows && incentiveSalesRows.length > 0
                ? {
                    AgreementId: incentiveSalesRows[0].AgreementId,
                    SalesPartnerId: incentiveSalesRows[0].SalesPartnerId,
                    IncentiveType: incentiveSalesRows[0].IncentiveType,
                    IncentiveValue: incentiveSalesRows[0].IncentiveValue,
                    PaymentStatus: incentiveSalesRows[0].PaymentStatus || 'unpaid',
                    ProspectName: incentiveSalesRows[0].ProspectName || null,
                    Notes: incentiveSalesRows[0].Notes || null
                }
                : null;

            return res.json({
                status: 'OK',
                data: {
                    agreement: agreements[0],
                    priceList: priceList || [],
                    incentivePartner,
                    incentiveSales
                }
            });
        } catch (err) {
            console.error('getLeaseAgreementDetail error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Validate price list rows
     * Checks each row has valid TipeDevice, JumlahUnit > 0, HargaPerUnit > 0, and correct Subtotal
     * @param {Array} priceList - Array of price list row objects
     * @returns {Array} Array of validation error messages (empty if valid)
     */
    _validatePriceList(priceList) {
        const errors = [];

        if (!Array.isArray(priceList)) {
            return errors;
        }

        for (let i = 0; i < priceList.length; i++) {
            const row = priceList[i];
            const rowNum = i + 1;

            if (!row.DeviceType || typeof row.DeviceType !== 'string' || !row.DeviceType.trim()) {
                errors.push(`Baris ${rowNum}: DeviceType wajib diisi`);
            }

            const quantity = parseInt(row.Quantity);
            if (!Number.isInteger(quantity) || quantity <= 0) {
                errors.push(`Baris ${rowNum}: Quantity harus bilangan positif`);
            }

            const unitPrice = parseFloat(row.UnitPrice);
            if (isNaN(unitPrice) || unitPrice <= 0) {
                errors.push(`Baris ${rowNum}: UnitPrice harus bilangan positif`);
            }

            if (Number.isInteger(quantity) && quantity > 0 && !isNaN(unitPrice) && unitPrice > 0) {
                const expectedSubtotal = quantity * unitPrice;
                const actualSubtotal = parseFloat(row.Subtotal);
                if (isNaN(actualSubtotal) || Math.abs(actualSubtotal - expectedSubtotal) > 0.01) {
                    errors.push(`Baris ${rowNum}: Subtotal tidak sesuai dengan Quantity x UnitPrice`);
                }
            }
        }

        return errors;
    }
    /**
     * Validate incentive type and value
     * @param {string} type - IncentiveType ('nominal' or 'percentage')
     * @param {number|string} value - IncentiveValue
     * @returns {Array} Array of error messages (empty if valid)
     */
    _validateIncentive(type, value) {
        const errors = [];

        if (type !== 'nominal' && type !== 'percentage') {
            errors.push('IncentiveType tidak valid');
            return errors;
        }

        const numValue = parseFloat(value);

        if (type === 'percentage') {
            if (isNaN(numValue) || numValue < 0 || numValue > 100) {
                errors.push('Nilai persentase harus antara 0-100');
            }
        } else if (type === 'nominal') {
            if (isNaN(numValue) || numValue < 0) {
                errors.push('Nilai insentif tidak boleh negatif');
            }
        }

        return errors;
    }

    /**
     * Delete a lease agreement by AgreementId (Super Admin only - RoleId=1)
     * Cascade FK on agreement_price_list handles price list cleanup automatically
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

            // Check if agreement exists
            const [existCheck] = await esql.sqlQuery(
                'SELECT COUNT(*) AS cnt FROM master_lease_agreement WHERE AgreementId = ?',
                [AgreementId]
            );
            if (!existCheck || existCheck.cnt === 0) {
                return res.status(404).json({ status: 'ERROR', message: 'Lease agreement tidak ditemukan' });
            }

            // Delete agreement (cascade FK handles price list)
            await esql.sqlQuery(
                'DELETE FROM master_lease_agreement WHERE AgreementId = ?',
                [AgreementId]
            );

            return res.json({ status: 'OK', message: 'Lease agreement berhasil dihapus' });
        } catch (err) {
            console.error('deleteLeaseAgreement error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get owner list for dropdown (users with RoleId=3)
     * Used in create/edit agreement forms
     */
    async getOwnerList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();

            const owners = await esql.sqlQuery(
                'SELECT UserId, DisplayName, MobilePhone FROM users WHERE RoleId = 3 ORDER BY DisplayName ASC',
                []
            );

            return res.json({ status: 'OK', data: { owners } });
        } catch (err) {
            console.error('getOwnerList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get pipeline list for dropdown
     * Used in create/edit agreement forms to link agreement to sales pipeline
     */
    async getPipelineList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();

            // Optional: include a specific pipeline that's already linked (for edit mode)
            const currentPipelineId = req.body.currentPipelineId || null;

            // Get pipelines that are NOT yet linked to an agreement
            // OR the pipeline that is currently linked to the agreement being edited
            // OR the latest pipeline for a specific owner (for wizard mode)
            let whereClause = `sp.PipelineId NOT IN (SELECT PipelineId FROM master_lease_agreement WHERE PipelineId IS NOT NULL)`;
            let params = [];

            if (currentPipelineId) {
                whereClause = `(${whereClause} OR sp.PipelineId = ?)`;
                params.push(currentPipelineId);
            }

            // Also include latest pipeline for owner (for wizard mode where pipeline was just created)
            const ownerIdFilter = req.body.ownerId || null;
            if (ownerIdFilter) {
                whereClause = `(${whereClause} OR sp.OwnerId = ?)`;
                params.push(ownerIdFilter);
            }

            const pipelines = await esql.sqlQuery(
                `SELECT sp.PipelineId, sp.SalesTrackerCode, sp.OwnerId, sp.CurrentMilestone, sp.CreatedAt, 
                    u.DisplayName AS OwnerName,
                    (SELECT COUNT(*) FROM device_controller dc 
                     JOIN outlet o ON dc.OutletId = o.OutletId 
                     WHERE o.OwnerId = sp.OwnerId) AS DeviceCount
                 FROM sales_pipeline sp 
                 JOIN users u ON sp.OwnerId = u.UserId 
                 WHERE ${whereClause}
                 ORDER BY sp.CreatedAt DESC`,
                params
            );

            return res.json({ status: 'OK', data: { pipelines } });
        } catch (err) {
            console.error('getPipelineList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Create a new lease agreement V2 with price list and incentive data (Super Admin only - RoleId=1)
     * NomorAgreement is auto-generated with format: MLA-YYYY-XXX
     * Validates OwnerId (RoleId=3), optional PartnerId, optional PipelineId, date range, price list, and incentive data
     * Inserts agreement, price list, and incentive records within a single transaction
     */
    async createLeaseAgreement(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) and Sales Admin (RoleId=6) can create
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { OwnerId, PartnerId, DeviceCount, RegistrationDate, StartDate, EndDate, Status, PipelineId, Notes, DownPayment, SubscriptionPlanId, PriceList,
                IncentivePartnerType, IncentivePartnerValue, IncentivePartnerNotes,
                SalesPartnerId, IncentiveSalesType, IncentiveSalesValue, IncentiveSalesNotes } = req.body;

            // Mandatory field validation
            if (!OwnerId) return res.json({ status: 'ERROR', message: 'OwnerId wajib diisi' });
            if (!RegistrationDate) return res.json({ status: 'ERROR', message: 'RegistrationDate wajib diisi' });

            // Validate date range: EndDate >= StartDate (only if both provided)
            if (StartDate && EndDate && new Date(EndDate) < new Date(StartDate)) {
                return res.json({ status: 'ERROR', message: 'End Date harus >= Start Date' });
            }

            // Validate OwnerId references user with RoleId=3
            const [ownerCheck] = await esql.sqlQuery(
                'SELECT COUNT(*) AS cnt FROM users WHERE UserId = ? AND RoleId = 3',
                [OwnerId]
            );
            if (!ownerCheck || ownerCheck.cnt === 0) {
                return res.json({ status: 'ERROR', message: 'Owner tidak valid' });
            }

            // Validate optional PartnerId if provided
            if (PartnerId) {
                const [partnerCheck] = await esql.sqlQuery(
                    'SELECT COUNT(*) AS cnt FROM partners WHERE PartnerId = ?',
                    [PartnerId]
                );
                if (!partnerCheck || partnerCheck.cnt === 0) {
                    return res.json({ status: 'ERROR', message: 'Partner tidak valid' });
                }
            }

            // Validate optional PipelineId if provided
            if (PipelineId) {
                const [pipelineCheck] = await esql.sqlQuery(
                    'SELECT COUNT(*) AS cnt FROM sales_pipeline WHERE PipelineId = ?',
                    [PipelineId]
                );
                if (!pipelineCheck || pipelineCheck.cnt === 0) {
                    return res.json({ status: 'ERROR', message: 'Pipeline tidak valid' });
                }
            }

            // Validate price list rows if provided
            if (PriceList && Array.isArray(PriceList) && PriceList.length > 0) {
                const priceListErrors = this._validatePriceList(PriceList);
                if (priceListErrors.length > 0) {
                    return res.json({ status: 'ERROR', message: priceListErrors[0] });
                }
            }

            // Validate incentive partner data if provided
            const hasIncentivePartner = IncentivePartnerType && IncentivePartnerValue !== undefined && IncentivePartnerValue !== null && IncentivePartnerValue !== '';
            if (hasIncentivePartner) {
                const partnerIncentiveErrors = this._validateIncentive(IncentivePartnerType, IncentivePartnerValue);
                if (partnerIncentiveErrors.length > 0) {
                    return res.json({ status: 'ERROR', message: partnerIncentiveErrors[0] });
                }
            }

            // Validate incentive sales data if provided
            const hasIncentiveSales = IncentiveSalesType && IncentiveSalesValue !== undefined && IncentiveSalesValue !== null && IncentiveSalesValue !== '';
            if (hasIncentiveSales) {
                const salesIncentiveErrors = this._validateIncentive(IncentiveSalesType, IncentiveSalesValue);
                if (salesIncentiveErrors.length > 0) {
                    return res.json({ status: 'ERROR', message: salesIncentiveErrors[0] });
                }

                // Validate SalesPartnerId exists in sales_partner table
                if (!SalesPartnerId) {
                    return res.json({ status: 'ERROR', message: 'Sales Partner wajib dipilih untuk insentif sales' });
                }
                const [salesCheck] = await esql.sqlQuery(
                    'SELECT COUNT(*) AS cnt FROM sales_partner WHERE SalesPartnerId = ?',
                    [SalesPartnerId]
                );
                if (!salesCheck || salesCheck.cnt === 0) {
                    return res.json({ status: 'ERROR', message: 'Sales Partner tidak valid' });
                }
            }

            // Generate AgreementNumber
            const AgreementNumber = await this._generateAgreementNumber(esql);

            // Use transaction for atomic insert of agreement + price list + incentives
            const conn = await esql.getConnection();
            try {
                await conn.beginTransaction();

                // Call SP_CreateLeaseAgreementV2 to insert the agreement
                const spRegistrationDate = RegistrationDate || new Date().toISOString().split('T')[0];
                const result = await conn.query(
                    'CALL SP_CreateLeaseAgreementV2(?,?,?,?,?,?,?,?)',
                    [OwnerId, PartnerId || null, AgreementNumber, parseInt(DeviceCount) || 0, spRegistrationDate, Status || 'active', PipelineId || null, Notes || null]
                );

                // Extract AgreementId from SP result
                // SP returns: [[{AgreementId: X}], FieldPackets] or [{AgreementId: X}]
                let AgreementId = null;
                if (result && result[0]) {
                    if (Array.isArray(result[0]) && result[0][0]) {
                        AgreementId = result[0][0].AgreementId;
                    } else if (result[0].AgreementId) {
                        AgreementId = result[0].AgreementId;
                    }
                }
                console.log('SP_CreateLeaseAgreementV2 result:', JSON.stringify(result));

                if (!AgreementId) {
                    await conn.rollback();
                    return res.status(500).json({ status: 'ERROR', message: 'Gagal membuat agreement - AgreementId not found in SP result' });
                }

                // Update DownPayment and SubscriptionPlanId if provided (not part of SP)
                if (DownPayment && DownPayment !== 'no') {
                    await conn.query(
                        'UPDATE master_lease_agreement SET DownPayment = ? WHERE AgreementId = ?',
                        [DownPayment, AgreementId]
                    );
                }
                if (SubscriptionPlanId) {
                    await conn.query(
                        'UPDATE master_lease_agreement SET SubscriptionPlanId = ? WHERE AgreementId = ?',
                        [parseInt(SubscriptionPlanId), AgreementId]
                    );
                    // Create owner_subscription record if StartDate and EndDate provided
                    if (StartDate && EndDate) {
                        // Get plan price
                        const planResult = await conn.query('SELECT Price FROM subscription_plan WHERE PlanId = ?', [parseInt(SubscriptionPlanId)]);
                        const plan = Array.isArray(planResult) && planResult[0] ? (Array.isArray(planResult[0]) ? planResult[0][0] : planResult[0]) : null;
                        const subAmount = plan ? plan.Price : 0;
                        await conn.query(
                            'INSERT INTO owner_subscription (OwnerId, PlanId, StartDate, EndDate, Status, PaymentStatus, Amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [OwnerId, parseInt(SubscriptionPlanId), StartDate, EndDate, 'active', 'unpaid', subAmount]
                        );
                        // Get the SubscriptionId
                        const lastSubResult = await conn.query('SELECT LAST_INSERT_ID() AS SubscriptionId');
                        const lastSub = Array.isArray(lastSubResult) && lastSubResult[0] ? (Array.isArray(lastSubResult[0]) ? lastSubResult[0][0] : lastSubResult[0]) : null;
                        if (lastSub && lastSub.SubscriptionId) {
                            await conn.query('UPDATE master_lease_agreement SET SubscriptionId = ? WHERE AgreementId = ?', [lastSub.SubscriptionId, AgreementId]);
                        }
                    }
                }

                // Insert price list rows if provided
                if (PriceList && Array.isArray(PriceList) && PriceList.length > 0) {
                    for (const row of PriceList) {
                        const quantity = parseInt(row.Quantity);
                        const unitPrice = parseFloat(row.UnitPrice);
                        const subtotal = parseFloat(row.Subtotal);
                        await conn.query(
                            'INSERT INTO agreement_price_list (AgreementId, DeviceType, Quantity, UnitPrice, Subtotal) VALUES (?, ?, ?, ?, ?)',
                            [AgreementId, row.DeviceType.trim(), quantity, unitPrice, subtotal]
                        );
                    }
                }

                // Insert incentive partner record if data provided
                if (hasIncentivePartner) {
                    await conn.query(
                        'INSERT INTO agreement_incentive_partner (AgreementId, IncentiveType, IncentiveValue, Notes) VALUES (?, ?, ?, ?)',
                        [AgreementId, IncentivePartnerType, parseFloat(IncentivePartnerValue), IncentivePartnerNotes || null]
                    );
                }

                // Insert incentive sales record if data provided
                if (hasIncentiveSales) {
                    await conn.query(
                        'INSERT INTO agreement_incentive_sales (AgreementId, SalesPartnerId, IncentiveType, IncentiveValue, Notes) VALUES (?, ?, ?, ?, ?)',
                        [AgreementId, SalesPartnerId, IncentiveSalesType, parseFloat(IncentiveSalesValue), IncentiveSalesNotes || null]
                    );
                }

                await conn.commit();

                // Sales Pipeline integration: trigger mla_created milestone if PipelineId is provided
                if (PipelineId && OwnerId) {
                    try {
                        const SalesPipelineModel = require('./sales_pipeline.js');
                        const pipelineModel = new SalesPipelineModel(this.token);
                        await pipelineModel.updateMilestone(OwnerId, 'mla_created', userData.user_id);
                    } catch (pipelineErr) {
                        // Pipeline operations should not break MLA creation flow
                        console.error('Sales pipeline update error (mla_created):', pipelineErr.message || pipelineErr);
                    }
                }

                return res.json({ status: 'OK', data: { AgreementId, AgreementNumber } });
            } catch (err) {
                await conn.rollback();
                throw err;
            } finally {
                conn.release();
            }
        } catch (err) {
            console.error('createLeaseAgreement error:', JSON.stringify(err.msgError || err.message || err));
            if (err.msgError && err.msgError.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ status: 'ERROR', message: 'Nomor agreement sudah ada' });
            }
            const errMsg = (err.msgError && err.msgError.sqlMessage) || err.message || 'Gagal membuat agreement';
            return res.status(500).json({ status: 'ERROR', message: errMsg });
        }
    }
    /**
     * Get sales partners filtered by PartnerId
     * Only accessible by Super Admin (RoleId=1)
     * Used by Sales dropdown on Agreement form to dynamically load options
     */
    async getSalesPartnerByPartnerId(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) and Sales Admin (RoleId=6) can access
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { PartnerId } = req.body;

            // Validate PartnerId is present and numeric
            if (!PartnerId || isNaN(Number(PartnerId))) {
                return res.json({ status: 'ERROR', message: 'PartnerId wajib diisi' });
            }

            // Query sales_partner filtered by PartnerId
            const salesPartners = await esql.sqlQuery(query.salesPartnerByPartnerId, [PartnerId]);

            return res.json({ status: 'OK', data: salesPartners || [] });
        } catch (err) {
            console.error('getSalesPartnerByPartnerId error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Update an existing lease agreement V2 with price list and incentive data (Super Admin only - RoleId=1)
     * NomorAgreement is read-only and not modifiable
     * Validates OwnerId (RoleId=3), optional PartnerId, optional PipelineId, date range, price list, and incentive data
     * Uses replace-all strategy for price list and incentive records: deletes all existing rows and inserts new ones
     */
    async updateLeaseAgreement(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) and Sales Admin (RoleId=6) can update
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { AgreementId, OwnerId, PartnerId, DeviceCount, RegistrationDate, StartDate, EndDate, Status, PipelineId, Notes, DownPayment, SubscriptionPlanId, PriceList,
                IncentivePartnerType, IncentivePartnerValue, IncentivePartnerNotes,
                SalesPartnerId, IncentiveSalesType, IncentiveSalesValue, IncentiveSalesNotes } = req.body;

            // Mandatory field validation
            if (!OwnerId) return res.json({ status: 'ERROR', message: 'OwnerId wajib diisi' });
            if (!RegistrationDate) return res.json({ status: 'ERROR', message: 'RegistrationDate wajib diisi' });

            // Validate date range: EndDate >= StartDate (only if both provided)
            if (StartDate && EndDate && new Date(EndDate) < new Date(StartDate)) {
                return res.json({ status: 'ERROR', message: 'End Date harus >= Start Date' });
            }

            // Validate OwnerId references user with RoleId=3
            const [ownerCheck] = await esql.sqlQuery(
                'SELECT COUNT(*) AS cnt FROM users WHERE UserId = ? AND RoleId = 3',
                [OwnerId]
            );
            if (!ownerCheck || ownerCheck.cnt === 0) {
                return res.json({ status: 'ERROR', message: 'Owner tidak valid' });
            }

            // Validate optional PartnerId if provided
            if (PartnerId) {
                const [partnerCheck] = await esql.sqlQuery(
                    'SELECT COUNT(*) AS cnt FROM partners WHERE PartnerId = ?',
                    [PartnerId]
                );
                if (!partnerCheck || partnerCheck.cnt === 0) {
                    return res.json({ status: 'ERROR', message: 'Partner tidak valid' });
                }
            }

            // Validate optional PipelineId if provided
            if (PipelineId) {
                const [pipelineCheck] = await esql.sqlQuery(
                    'SELECT COUNT(*) AS cnt FROM sales_pipeline WHERE PipelineId = ?',
                    [PipelineId]
                );
                if (!pipelineCheck || pipelineCheck.cnt === 0) {
                    return res.json({ status: 'ERROR', message: 'Pipeline tidak valid' });
                }
            }

            // Validate price list rows if provided
            if (PriceList && Array.isArray(PriceList) && PriceList.length > 0) {
                const priceListErrors = this._validatePriceList(PriceList);
                if (priceListErrors.length > 0) {
                    return res.json({ status: 'ERROR', message: priceListErrors[0] });
                }
            }

            // Validate incentive partner data if provided
            const hasIncentivePartner = IncentivePartnerType && IncentivePartnerValue !== undefined && IncentivePartnerValue !== null && IncentivePartnerValue !== '';
            if (hasIncentivePartner) {
                const partnerIncentiveErrors = this._validateIncentive(IncentivePartnerType, IncentivePartnerValue);
                if (partnerIncentiveErrors.length > 0) {
                    return res.json({ status: 'ERROR', message: partnerIncentiveErrors[0] });
                }
            }

            // Validate incentive sales data if provided
            const hasIncentiveSales = SalesPartnerId && IncentiveSalesType && IncentiveSalesValue !== undefined && IncentiveSalesValue !== null && IncentiveSalesValue !== '';
            if (hasIncentiveSales) {
                const salesIncentiveErrors = this._validateIncentive(IncentiveSalesType, IncentiveSalesValue);
                if (salesIncentiveErrors.length > 0) {
                    return res.json({ status: 'ERROR', message: salesIncentiveErrors[0] });
                }

                // Validate SalesPartnerId exists
                const [salesCheck] = await esql.sqlQuery(
                    'SELECT COUNT(*) AS cnt FROM sales_partner WHERE SalesPartnerId = ?',
                    [SalesPartnerId]
                );
                if (!salesCheck || salesCheck.cnt === 0) {
                    return res.json({ status: 'ERROR', message: 'Sales Partner tidak valid' });
                }
            }

            // Check agreement exists
            const [existsCheck] = await esql.sqlQuery(
                'SELECT COUNT(*) AS cnt FROM master_lease_agreement WHERE AgreementId = ?',
                [AgreementId]
            );
            if (!existsCheck || existsCheck.cnt === 0) {
                return res.status(404).json({ status: 'ERROR', message: 'Lease agreement tidak ditemukan' });
            }

            // Use transaction for atomic update
            const conn = await esql.getConnection();
            try {
                await conn.beginTransaction();

                // Call SP_UpdateLeaseAgreementV2 to update the agreement (without StartDate/EndDate)
                await conn.query(
                    query.SP_UpdateLeaseAgreementV2,
                    [AgreementId, OwnerId, PartnerId || null, DeviceCount, RegistrationDate, Status || 'active', PipelineId || null, Notes || null, DownPayment || null]
                );

                // Update subscription if SubscriptionPlanId and dates provided
                if (SubscriptionPlanId) {
                    await conn.query('UPDATE master_lease_agreement SET SubscriptionPlanId = ? WHERE AgreementId = ?', [parseInt(SubscriptionPlanId), AgreementId]);
                    if (StartDate && EndDate) {
                        // Check if subscription already exists for this MLA
                        const [existingSub] = await conn.query('SELECT SubscriptionId FROM master_lease_agreement WHERE AgreementId = ?', [AgreementId]);
                        if (existingSub && existingSub.SubscriptionId) {
                            // Update existing subscription
                            await conn.query('UPDATE owner_subscription SET PlanId = ?, StartDate = ?, EndDate = ? WHERE SubscriptionId = ?',
                                [parseInt(SubscriptionPlanId), StartDate, EndDate, existingSub.SubscriptionId]);
                        } else {
                            // Create new subscription
                            const [plan] = await conn.query('SELECT Price FROM subscription_plan WHERE PlanId = ?', [parseInt(SubscriptionPlanId)]);
                            const subAmount = plan ? plan.Price : 0;
                            await conn.query(
                                'INSERT INTO owner_subscription (OwnerId, PlanId, StartDate, EndDate, Status, PaymentStatus, Amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                [OwnerId, parseInt(SubscriptionPlanId), StartDate, EndDate, 'active', 'unpaid', subAmount]
                            );
                            const [lastSub] = await conn.query('SELECT LAST_INSERT_ID() AS SubscriptionId');
                            if (lastSub && lastSub.SubscriptionId) {
                                await conn.query('UPDATE master_lease_agreement SET SubscriptionId = ? WHERE AgreementId = ?', [lastSub.SubscriptionId, AgreementId]);
                            }
                        }
                    }
                }

                // Delete all existing price list records for this agreement (replace-all strategy)
                await conn.query(
                    'DELETE FROM agreement_price_list WHERE AgreementId = ?',
                    [AgreementId]
                );

                // Insert new price list rows if provided
                if (PriceList && Array.isArray(PriceList) && PriceList.length > 0) {
                    for (const row of PriceList) {
                        const quantity = parseInt(row.Quantity);
                        const unitPrice = parseFloat(row.UnitPrice);
                        const subtotal = parseFloat(row.Subtotal);
                        await conn.query(
                            'INSERT INTO agreement_price_list (AgreementId, DeviceType, Quantity, UnitPrice, Subtotal) VALUES (?, ?, ?, ?, ?)',
                            [AgreementId, row.DeviceType.trim(), quantity, unitPrice, subtotal]
                        );
                    }

                    // Recalculate invoice amounts if invoices exist for this agreement
                    const totalResults = await conn.query(
                        'SELECT IFNULL(SUM(Subtotal), 0) AS TotalHarga FROM agreement_price_list WHERE AgreementId = ?',
                        [AgreementId]
                    );
                    const totalHarga = parseFloat(totalResults[0].TotalHarga) || 0;

                    if (totalHarga > 0) {
                        // Update DP invoice amount (30%)
                        const dpAmount = Math.round(totalHarga * 0.30 * 100) / 100;
                        await conn.query(
                            "UPDATE agreement_invoice SET Amount = ? WHERE AgreementId = ? AND InvoiceType = 'down_payment'",
                            [dpAmount, AgreementId]
                        );

                        // Update Settlement invoice amount (70%)
                        const settlementAmount = Math.round(totalHarga * 0.70 * 100) / 100;
                        await conn.query(
                            "UPDATE agreement_invoice SET Amount = ? WHERE AgreementId = ? AND InvoiceType = 'settlement'",
                            [settlementAmount, AgreementId]
                        );
                    }
                }

                // Replace-all strategy for incentive records
                // Step 1: DELETE existing incentive records for this AgreementId
                await conn.query(query.deleteIncentivePartner, [AgreementId]);
                await conn.query(query.deleteIncentiveSales, [AgreementId]);

                // Step 2: INSERT new incentive partner record if data provided
                if (hasIncentivePartner) {
                    await conn.query(
                        'INSERT INTO agreement_incentive_partner (AgreementId, IncentiveType, IncentiveValue, Notes) VALUES (?, ?, ?, ?)',
                        [AgreementId, IncentivePartnerType, parseFloat(IncentivePartnerValue), IncentivePartnerNotes || null]
                    );
                }

                // Step 3: INSERT new incentive sales record if data provided
                if (hasIncentiveSales) {
                    await conn.query(
                        'INSERT INTO agreement_incentive_sales (AgreementId, SalesPartnerId, IncentiveType, IncentiveValue, Notes) VALUES (?, ?, ?, ?, ?)',
                        [AgreementId, SalesPartnerId, IncentiveSalesType, parseFloat(IncentiveSalesValue), IncentiveSalesNotes || null]
                    );
                }

                await conn.commit();
            } catch (txErr) {
                await conn.rollback();
                throw txErr;
            } finally {
                conn.release();
            }

            return res.json({ status: 'OK', data: { AgreementId } });
        } catch (err) {
            console.error('updateLeaseAgreement error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }
}

module.exports = LeaseAgreementV2Model;
