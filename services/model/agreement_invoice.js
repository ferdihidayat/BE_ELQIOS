const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');
const query = require('../query/query.js');

class AgreementInvoiceModel {
    constructor(token) {
        this.token = token;
    }

    _getUserData() {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
        return JSON.parse(decoded.gen);
    }

    /**
     * Auto-generate InvoiceNumber with format INV-YYYY-MM-XXX
     * Queries the highest existing number for the current month and increments by 1
     * If no existing records for current month, starts at 001
     * @param {Esql} esql - Database entity instance
     * @returns {Promise<string>} Generated InvoiceNumber (format: INV-YYYY-MM-XXX)
     */
    async _generateInvoiceNumber(esql) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `INV-${currentYear}-${currentMonth}`;

        const [lastInvoice] = await esql.sqlQuery(
            `SELECT InvoiceNumber FROM agreement_invoice WHERE InvoiceNumber LIKE ? ORDER BY InvoiceNumber DESC LIMIT 1`,
            [`${prefix}-%`]
        );

        let nextNumber = 1;
        if (lastInvoice && lastInvoice.InvoiceNumber) {
            const parts = lastInvoice.InvoiceNumber.split('-');
            const lastNum = parseInt(parts[3]) || 0;
            nextNumber = lastNum + 1;
        }

        return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
    }

    /**
     * Calculate Total Harga from agreement_price_list for a given AgreementId
     * Returns SUM(Subtotal) from all price list rows for the agreement
     * @param {Esql} esql - Database entity instance
     * @param {number} agreementId - The AgreementId to calculate total for
     * @returns {Promise<number>} Total harga (sum of all Subtotal values)
     */
    async _calculateTotalHarga(esql, agreementId) {
        const [result] = await esql.sqlQuery(
            `SELECT IFNULL(SUM(Subtotal), 0) AS TotalHarga FROM agreement_price_list WHERE AgreementId = ?`,
            [agreementId]
        );

        return parseFloat(result.TotalHarga) || 0;
    }

    /**
     * Create a new invoice or return existing one for given AgreementId + InvoiceType (idempotent)
     * Only accessible by Super Admin (RoleId=1)
     * 
     * Request body: { AgreementId, InvoiceType }
     * InvoiceType must be 'down_payment' or 'settlement'
     * 
     * If invoice already exists: returns existing InvoiceId
     * If not exists: calculates amount from price list, generates InvoiceNumber, creates new invoice
     */
    async createOrGetInvoice(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can access
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { AgreementId, InvoiceType } = req.body;

            // Validate InvoiceType
            const validInvoiceTypes = ['down_payment', 'settlement'];
            if (!InvoiceType || !validInvoiceTypes.includes(InvoiceType)) {
                return res.status(400).json({ status: 'ERROR', message: 'InvoiceType tidak valid' });
            }

            // Check if agreement exists
            const [agreementCheck] = await esql.sqlQuery(
                'SELECT COUNT(*) AS cnt FROM master_lease_agreement WHERE AgreementId = ?',
                [AgreementId]
            );
            if (!agreementCheck || agreementCheck.cnt === 0) {
                return res.status(404).json({ status: 'ERROR', message: 'Agreement tidak ditemukan' });
            }

            // Check if agreement has price list records
            const [priceListCheck] = await esql.sqlQuery(
                'SELECT COUNT(*) AS cnt FROM agreement_price_list WHERE AgreementId = ?',
                [AgreementId]
            );
            if (!priceListCheck || priceListCheck.cnt === 0) {
                return res.status(400).json({ status: 'ERROR', message: 'Agreement tidak memiliki price list' });
            }

            // Check if invoice already exists for this AgreementId + InvoiceType
            const existingInvoice = await esql.sqlQuery(
                'SELECT InvoiceId FROM agreement_invoice WHERE AgreementId = ? AND InvoiceType = ?',
                [AgreementId, InvoiceType]
            );

            if (existingInvoice && existingInvoice.length > 0) {
                // Idempotent: return existing InvoiceId
                return res.json({
                    status: 'OK',
                    data: { InvoiceId: existingInvoice[0].InvoiceId, existing: true }
                });
            }

            // Calculate Total_Harga from price list
            const totalHarga = await this._calculateTotalHarga(esql, AgreementId);

            // Get DownPayment setting from agreement
            const [agreementData] = await esql.sqlQuery(
                'SELECT DownPayment FROM master_lease_agreement WHERE AgreementId = ?',
                [AgreementId]
            );
            const hasDownPayment = agreementData && agreementData.DownPayment === 'yes';

            // Apply percentage based on InvoiceType and DownPayment setting
            let percentage;
            if (InvoiceType === 'down_payment') {
                percentage = 0.30; // DP always 30%
            } else {
                // Settlement: 70% if DP exists, 100% if no DP
                percentage = hasDownPayment ? 0.70 : 1.00;
            }
            const amount = Math.round(totalHarga * percentage * 100) / 100; // Round to 2 decimal places

            // Generate InvoiceNumber
            const invoiceNumber = await this._generateInvoiceNumber(esql);

            // Insert new invoice record
            const insertResult = await esql.sqlQuery(
                `INSERT INTO agreement_invoice (AgreementId, InvoiceNumber, InvoiceType, Amount, PaymentStatus) VALUES (?, ?, ?, ?, 'unpaid')`,
                [AgreementId, invoiceNumber, InvoiceType, amount]
            );

            return res.json({
                status: 'OK',
                data: { InvoiceId: insertResult.insertId, existing: false }
            });
        } catch (err) {
            console.error('createOrGetInvoice error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }
    /**
     * Get paginated list of invoices with AgreementNumber and OwnerName
     * Only accessible by Super Admin (RoleId=1)
     * Supports optional PaymentStatus filter
     */
    async getInvoiceList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can access
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 10;
            const offset = (page - 1) * limit;
            const { PaymentStatus } = req.body;

            // Build WHERE clause with optional PaymentStatus filter
            let whereClause = 'WHERE 1=1';
            let params = [];

            if (PaymentStatus && ['unpaid', 'paid', 'overdue'].includes(PaymentStatus)) {
                whereClause += ' AND ai.PaymentStatus = ?';
                params.push(PaymentStatus);
            }

            // Count total records
            const countQuery = `SELECT COUNT(*) AS total FROM agreement_invoice ai JOIN master_lease_agreement mla ON ai.AgreementId = mla.AgreementId JOIN users u ON mla.OwnerId = u.UserId ${whereClause}`;
            const [countResult] = await esql.sqlQuery(countQuery, params);
            const total = countResult?.total || 0;

            // Get paginated list ordered by CreatedAt DESC
            const listQuery = `SELECT ai.InvoiceId, ai.InvoiceNumber, mla.AgreementNumber, u.DisplayName AS OwnerName, ai.InvoiceType, ai.Amount, ai.DueDate, ai.PaymentStatus, ai.CreatedAt FROM agreement_invoice ai JOIN master_lease_agreement mla ON ai.AgreementId = mla.AgreementId JOIN users u ON mla.OwnerId = u.UserId ${whereClause} ORDER BY ai.CreatedAt DESC LIMIT ? OFFSET ?`;
            const invoices = await esql.sqlQuery(listQuery, [...params, limit, offset]);

            const totalPages = Math.ceil(total / limit);

            return res.json({
                status: 'OK',
                data: {
                    invoices,
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
            console.error('getInvoiceList error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get invoice detail by InvoiceId with owner info and price list items
     * Only accessible by Super Admin (RoleId=1)
     * Returns full invoice data including owner name, address, phone, agreement info, and price list
     */
    async getInvoiceDetail(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can access
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { InvoiceId } = req.body;

            // Query invoice with JOINs to get owner info and agreement info
            const invoiceQuery = `
                SELECT ai.InvoiceId, ai.AgreementId, ai.InvoiceNumber, ai.InvoiceType, ai.Amount, 
                    ai.DueDate, ai.PaymentStatus, ai.PaidAt, ai.Notes, ai.CreatedAt, ai.UpdatedAt,
                    mla.AgreementNumber,
                    u.DisplayName AS OwnerName, u.MobilePhone AS OwnerPhone,
                    o.Address AS OwnerAddress
                FROM agreement_invoice ai
                JOIN master_lease_agreement mla ON ai.AgreementId = mla.AgreementId
                JOIN users u ON mla.OwnerId = u.UserId
                LEFT JOIN outlet o ON o.OwnerId = u.UserId AND o.IsActive = 1
                WHERE ai.InvoiceId = ?
                LIMIT 1
            `;
            const invoiceResult = await esql.sqlQuery(invoiceQuery, [InvoiceId]);

            if (!invoiceResult || invoiceResult.length === 0) {
                return res.status(404).json({ status: 'ERROR', message: 'Invoice tidak ditemukan' });
            }

            const invoice = invoiceResult[0];

            // Query agreement price list items
            const priceList = await esql.sqlQuery(
                'SELECT PriceListId, DeviceType, Quantity, UnitPrice, Subtotal FROM agreement_price_list WHERE AgreementId = ? ORDER BY PriceListId ASC',
                [invoice.AgreementId]
            );

            return res.json({
                status: 'OK',
                data: {
                    invoice,
                    priceList: priceList || []
                }
            });
        } catch (err) {
            console.error('getInvoiceDetail error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }
    /**
     * Update invoice mutable fields: DueDate, Notes, PaymentStatus
     * Only accessible by Super Admin (RoleId=1)
     * Immutable fields (InvoiceNumber, InvoiceType, AgreementId, Amount) are ignored if sent
     * Handles PaidAt logic:
     *   - When PaymentStatus changes to 'paid': set PaidAt = NOW()
     *   - When PaymentStatus changes from 'paid' to other: set PaidAt = NULL
     */
    async updateInvoice(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can access
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { InvoiceId, DueDate, Notes, PaymentStatus } = req.body;

            // Validate PaymentStatus if provided
            const validStatuses = ['unpaid', 'paid', 'overdue'];
            if (PaymentStatus && !validStatuses.includes(PaymentStatus)) {
                return res.status(400).json({ status: 'ERROR', message: 'PaymentStatus tidak valid' });
            }

            // Check if invoice exists and get current PaymentStatus
            const existingInvoice = await esql.sqlQuery(
                'SELECT InvoiceId, PaymentStatus FROM agreement_invoice WHERE InvoiceId = ?',
                [InvoiceId]
            );

            if (!existingInvoice || existingInvoice.length === 0) {
                return res.status(404).json({ status: 'ERROR', message: 'Invoice tidak ditemukan' });
            }

            const currentStatus = existingInvoice[0].PaymentStatus;

            // Build SET clause for only mutable fields
            let setClauses = [];
            let params = [];

            if (DueDate !== undefined) {
                setClauses.push('DueDate = ?');
                params.push(DueDate || null);
            }

            if (Notes !== undefined) {
                setClauses.push('Notes = ?');
                params.push(Notes || null);
            }

            if (PaymentStatus) {
                setClauses.push('PaymentStatus = ?');
                params.push(PaymentStatus);

                // Handle PaidAt logic based on status transition
                if (currentStatus !== 'paid' && PaymentStatus === 'paid') {
                    // Transitioning to 'paid': set PaidAt = NOW()
                    setClauses.push('PaidAt = NOW()');
                } else if (currentStatus === 'paid' && PaymentStatus !== 'paid') {
                    // Transitioning from 'paid' to other: set PaidAt = NULL
                    setClauses.push('PaidAt = NULL');
                }
            }

            if (setClauses.length === 0) {
                return res.json({ status: 'OK', message: 'Tidak ada perubahan' });
            }

            // Execute update
            params.push(InvoiceId);
            await esql.sqlQuery(
                `UPDATE agreement_invoice SET ${setClauses.join(', ')} WHERE InvoiceId = ?`,
                params
            );

            return res.json({ status: 'OK', message: 'Invoice berhasil diupdate' });
        } catch (err) {
            console.error('updateInvoice error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Delete invoice by InvoiceId
     * Only accessible by Super Admin (RoleId=1)
     * Checks if invoice exists before deleting; returns 404 if not found
     */
    async deleteInvoice(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            // Only Super Admin (RoleId=1) can access
            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { InvoiceId } = req.body;

            // Check if invoice exists
            const existingInvoice = await esql.sqlQuery(
                'SELECT InvoiceId FROM agreement_invoice WHERE InvoiceId = ?',
                [InvoiceId]
            );

            if (!existingInvoice || existingInvoice.length === 0) {
                return res.status(404).json({ status: 'ERROR', message: 'Invoice tidak ditemukan' });
            }

            // Delete invoice record
            await esql.sqlQuery(
                'DELETE FROM agreement_invoice WHERE InvoiceId = ?',
                [InvoiceId]
            );

            return res.json({ status: 'OK', message: 'Invoice berhasil dihapus' });
        } catch (err) {
            console.error('deleteInvoice error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }

    /**
     * Get all invoices for a specific AgreementId
     * Only accessible by Super Admin (RoleId=1)
     */
    async getInvoicesByAgreement(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();

            if (![1, 6].includes(userData.role_id)) {
                return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
            }

            const { AgreementId } = req.body;

            const invoices = await esql.sqlQuery(
                'SELECT InvoiceId, AgreementId, InvoiceNumber, InvoiceType, Amount, DueDate, PaymentStatus, PaidAt, Notes, CreatedAt FROM agreement_invoice WHERE AgreementId = ? ORDER BY InvoiceType ASC',
                [AgreementId]
            );

            return res.json({ status: 'OK', data: { invoices: invoices || [] } });
        } catch (err) {
            console.error('getInvoicesByAgreement error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || err.msgError });
        }
    }
}

module.exports = AgreementInvoiceModel;
