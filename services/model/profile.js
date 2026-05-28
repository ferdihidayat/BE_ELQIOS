const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const Encrypt = require('../helpers/encrypt.js');
const config = require('../config.js');
const query = require('../query/query.js');

class ProfileModel {
    constructor(token) {
        this.token = token;
    }

    _getUserData() {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
        return JSON.parse(decoded.gen);
    }

    async getProfile(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const rows = await esql.sqlQuery(query.getOwnerProfile, [userData.mobile_phone]);

            if (!rows || !rows.length) {
                return res.json({ status: 'ERROR', message: 'Profile tidak ditemukan' });
            }

            return res.json({
                status: 'OK',
                data: {
                    user_id: rows[0].UserId,
                    display_name: rows[0].DisplayName,
                    mobile_phone: rows[0].MobilePhone,
                    email: rows[0].Email,
                    outlets: rows.map(r => ({
                        outlet_id: r.OutletId,
                        outlet_code: r.OutletCode,
                        outlet_name: r.OutletName
                    }))
                }
            });
        } catch (err) {
            console.error('getProfile error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async updateProfile(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const { display_name, outlet_name, outlet_id } = req.body;

            let updated = [];

            // Update display name (owner name)
            if (display_name && display_name.trim()) {
                await esql.sqlQuery(query.updateDisplayName, [display_name.trim(), userData.user_id]);
                updated.push('display_name');
            }

            // Update email
            if (req.body.email !== undefined) {
                const emailVal = req.body.email.trim();
                if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
                    return res.json({ status: 'ERROR', message: 'Format email tidak valid' });
                }
                await esql.sqlQuery('UPDATE users SET Email = ? WHERE UserId = ? AND IsActive = 1', [emailVal, userData.user_id]);
                updated.push('email');
            }

            // Update outlet name
            if (outlet_name && outlet_name.trim() && outlet_id) {
                await esql.sqlQuery(query.updateOutletName, [outlet_name.trim(), outlet_id, userData.user_id]);
                updated.push('outlet_name');
            }

            return res.json({ status: 'OK', message: 'Profile berhasil diupdate', updated });
        } catch (err) {
            console.error('updateProfile error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async changePassword(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            let enc = new Encrypt();
            const userData = this._getUserData();
            const { current_password, new_password } = req.body;

            if (!current_password || !new_password) {
                return res.json({ status: 'ERROR', message: 'Password lama dan baru wajib diisi' });
            }

            if (new_password.length < 6) {
                return res.json({ status: 'ERROR', message: 'Password baru minimal 6 karakter' });
            }

            // Verify current password
            const rows = await esql.sqlQuery(
                'SELECT Password FROM users WHERE UserId = ? AND IsActive = 1',
                [userData.user_id]
            );

            if (!rows || !rows.length) {
                return res.json({ status: 'ERROR', message: 'User tidak ditemukan' });
            }

            const storedDecrypted = enc.DecyptAES(rows[0].Password, config.encKey);
            if (storedDecrypted !== current_password) {
                return res.json({ status: 'ERROR', message: 'Password lama salah' });
            }

            // Encrypt new password
            const encryptedNew = enc.EncryptAES(new_password, config.encKey);
            await esql.sqlQuery(query.updatePassword, [encryptedNew, userData.user_id]);

            return res.json({ status: 'OK', message: 'Password berhasil diubah' });
        } catch (err) {
            console.error('changePassword error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async getBankAccount(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const userData = this._getUserData();
            const bankAccounts = await esql.sqlQuery(query.getOwnerBankAccount, [userData.mobile_phone]);
            const bankList = await esql.sqlQuery(query.getBankList);

            return res.json({
                status: 'OK',
                data: {
                    bankAccounts: bankAccounts || [],
                    bankList: bankList || [],
                    user: userData
                }
            });
        } catch (err) {
            console.error('getBankAccount error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async updateBankAccount(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const { bank_id, bank_no, bank_name, account_name } = req.body;

            if (!bank_id || !bank_no || !bank_name || !account_name) {
                return res.json({ status: 'ERROR', message: 'Semua field wajib diisi' });
            }

            await esql.sqlQuery(query.updateBankAccount, [bank_no, bank_name, account_name, bank_id]);

            return res.json({ status: 'OK', message: 'Bank account berhasil diupdate' });
        } catch (err) {
            console.error('updateBankAccount error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }
}

module.exports = ProfileModel;
