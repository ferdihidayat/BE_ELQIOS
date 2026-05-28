const Esql = require('../helpers/entity.js');
const BearerToken = require('../helpers/auth.js');
const Encrypt = require('../helpers/encrypt.js');
const config = require('../config.js');
const SalesPipelineModel = require('./sales_pipeline.js');

class UserAdminModel {
    constructor(token) {
        this.token = token;
    }

    async getUserList(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';
            const role = req.query.role || '';

            let conditions = 'u.IsActive = 1';
            let params = [];

            if (search) {
                conditions += ' AND (u.DisplayName LIKE ? OR u.MobilePhone LIKE ? OR u.Email LIKE ?)';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            if (role) {
                conditions += ' AND u.RoleId = ?';
                params.push(parseInt(role));
            }

            const [countResult] = await esql.sqlQuery(`SELECT COUNT(*) AS total FROM users u WHERE ${conditions}`, params);
            const total = countResult?.total || 0;

            const users = await esql.sqlQuery(`
                SELECT u.UserId, u.DisplayName, u.MobilePhone, u.Email, u.RoleId, 
                    r.RoleName, u.IsLogin, u.IsActive, u.PayloadId
                FROM users u
                LEFT JOIN roles r ON u.RoleId = r.RoleId
                WHERE ${conditions}
                ORDER BY u.UserId DESC
                LIMIT ? OFFSET ?`, [...params, limit, offset]);

            const roles = await esql.sqlQuery('SELECT RoleId, RoleName FROM roles ORDER BY RoleId');

            return res.json({
                status: 'OK',
                data: {
                    users,
                    roles,
                    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }
                }
            });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async getUserDetail(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const [user] = await esql.sqlQuery(`
                SELECT u.UserId, u.DisplayName, u.MobilePhone, u.Email, u.RoleId, r.RoleName, u.IsActive, u.SecretId, u.PartnerId
                FROM users u LEFT JOIN roles r ON u.RoleId = r.RoleId
                WHERE u.UserId = ?`, [req.query.id]);
            if (!user) return res.json({ status: 'ERROR', message: 'User tidak ditemukan' });

            // Jika role 3 (Owner), ambil bank account + outlet/device summary
            let bankAccount = null;
            let outletSummary = [];
            let deviceByType = [];

            if (user.RoleId === 3) {
                const banks = await esql.sqlQuery(`
                    SELECT ba.BankId, ba.BankNo, ba.BankName, ba.AccountName
                    FROM bank_account ba
                    JOIN outlet o ON o.BankAccountId = ba.BankId
                    WHERE o.OwnerId = ? AND ba.IsActive = 1
                    LIMIT 1`, [user.UserId]);
                bankAccount = banks.length ? banks[0] : null;

                outletSummary = await esql.sqlQuery(`
                    SELECT o.OutletId, o.OutletCode, o.OutletName,
                        (SELECT COUNT(*) FROM device_controller dc WHERE dc.OutletId = o.OutletId AND dc.IsActive=1) AS TotalDevice
                    FROM outlet o WHERE o.OwnerId = ? AND o.IsActive = 1`, [user.UserId]);

                deviceByType = await esql.sqlQuery(`
                    SELECT dt.TypeName, COUNT(*) AS total
                    FROM device_controller dc
                    JOIN outlet o ON dc.OutletId = o.OutletId
                    JOIN device_type dt ON dc.DeviceTypeId = dt.Id
                    WHERE o.OwnerId = ? AND dc.IsActive = 1
                    GROUP BY dt.TypeName`, [user.UserId]);
            }

            return res.json({ status: 'OK', data: { ...user, bankAccount, outletSummary, deviceByType } });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async updateUser(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const { user_id, display_name, email, role_id, is_active, partner_id } = req.body;
            if (!user_id) return res.json({ status: 'ERROR', message: 'user_id wajib' });

            // Validate PartnerId is required when RoleId=8
            const effectiveRoleId = role_id ? parseInt(role_id) : null;
            if (effectiveRoleId === 8 && !partner_id) {
                return res.json({ status: 'ERROR', message: 'Partner wajib dipilih untuk role Partner (RoleId=8)' });
            }

            let sets = [], params = [];
            if (display_name) { sets.push('DisplayName = ?'); params.push(display_name); }
            if (email !== undefined) { sets.push('Email = ?'); params.push(email); }
            if (role_id) { sets.push('RoleId = ?'); params.push(parseInt(role_id)); }
            if (is_active !== undefined) { sets.push('IsActive = ?'); params.push(parseInt(is_active)); }

            // Handle PartnerId: set when RoleId=8, clear when role changes away from 8
            if (effectiveRoleId === 8 && partner_id) {
                sets.push('PartnerId = ?');
                params.push(parseInt(partner_id));
            } else if (effectiveRoleId && effectiveRoleId !== 8) {
                sets.push('PartnerId = NULL');
            }

            if (!sets.length) return res.json({ status: 'ERROR', message: 'Tidak ada data yang diubah' });

            params.push(user_id);
            await esql.sqlQuery(`UPDATE users SET ${sets.join(', ')} WHERE UserId = ?`, params);
            return res.json({ status: 'OK', message: 'User berhasil diupdate' });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async createUser(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            let enc = new Encrypt();
            const speakeasy = require('speakeasy');
            const QRCode = require('qrcode');
            const nodemailer = require('nodemailer');

            const { display_name, mobile_phone, password, email, role_id, bank_name, bank_no, account_name, partner_id } = req.body;

            if (!display_name || !mobile_phone || !password) {
                return res.json({ status: 'ERROR', message: 'Nama, No HP, dan password wajib diisi' });
            }
            if (!email) {
                return res.json({ status: 'ERROR', message: 'Email wajib diisi' });
            }
            if (!bank_name || !bank_no || !account_name) {
                return res.json({ status: 'ERROR', message: 'Data bank account wajib diisi (nama bank, no rekening, atas nama)' });
            }

            // Validate PartnerId is required when RoleId=8
            const effectiveRoleId = parseInt(role_id) || 3;
            if (effectiveRoleId === 8 && !partner_id) {
                return res.json({ status: 'ERROR', message: 'Partner wajib dipilih untuk role Partner (RoleId=8)' });
            }

            const [existing] = await esql.sqlQuery('SELECT UserId FROM users WHERE MobilePhone = ?', [mobile_phone]);
            if (existing) return res.json({ status: 'ERROR', message: 'Nomor HP sudah terdaftar' });

            // Generate Google Authenticator secret
            const secret = speakeasy.generateSecret({ name: `ELQIOS (${mobile_phone})` });
            const secretId = secret.base32;

            // Encrypt password
            const encPassword = enc.EncryptAES(password, config.encKey);

            // Insert user with SecretId and PartnerId
            const insertPartnerId = effectiveRoleId === 8 ? parseInt(partner_id) : null;
            const UnixId = require('../helpers/uuid.js');
            const uuidGen = new UnixId();
            const userUuid = uuidGen.version4();
            await esql.sqlQuery(
                'INSERT INTO users (DisplayName, MobilePhone, Password, Email, RoleId, SecretId, PartnerId, uuid, IsActive, IsLogin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)',
                [display_name, mobile_phone, encPassword, email, effectiveRoleId, secretId, insertPartnerId, userUuid]
            );

            // Get the newly created user's UserId
            const [newUser] = await esql.sqlQuery('SELECT UserId FROM users WHERE MobilePhone = ?', [mobile_phone]);
            const newUserId = newUser ? newUser.UserId : null;

            // Insert into user_roles
            if (newUserId) {
                await esql.sqlQuery(
                    'INSERT INTO user_roles (UserId, RoleId, IsActive, InsertBy) VALUES (?, ?, 1, 1)',
                    [newUserId, effectiveRoleId]
                );
            }

            // Create bank account
            await esql.sqlQuery(
                'INSERT INTO bank_account (BankNo, BankName, AccountName, Description, IsActive, InsertBy) VALUES (?, ?, ?, ?, 1, 1)',
                [bank_no, bank_name, account_name, display_name]
            );

            // If the created user is an Owner (RoleId=3), create a sales pipeline (MANDATORY)
            // If pipeline creation fails, rollback user and bank account
            if (effectiveRoleId === 3) {
                try {
                    if (!newUserId) {
                        throw new Error('User baru tidak ditemukan setelah insert');
                    }

                    // Get the creator's UserId from the token
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(this.token, config.jwtAlgorithm.keyBase22);
                    const creatorData = JSON.parse(decoded.gen);
                    const creatorUserId = creatorData.user_id;

                    // Create pipeline record (mandatory - must succeed)
                    const pipelineModel = new SalesPipelineModel(this.token);
                    const pipelineResult = await pipelineModel.createPipeline(newUserId, creatorUserId);

                    if (pipelineResult.status !== 'OK') {
                        throw new Error(pipelineResult.message || 'Gagal membuat pipeline');
                    }
                } catch (pipelineErr) {
                    console.error('Pipeline creation FAILED - rolling back user:', pipelineErr.message);

                    // Rollback: delete bank account and user
                    try {
                        await esql.sqlQuery('DELETE FROM bank_account WHERE AccountName = ? AND BankNo = ?', [account_name, bank_no]);
                    } catch (e) { /* silent */ }
                    try {
                        await esql.sqlQuery('DELETE FROM users WHERE UserId = ?', [newUserId]);
                    } catch (e) { /* silent */ }

                    return res.status(500).json({
                        status: 'ERROR',
                        message: 'Gagal membuat pipeline/sales tracker. User tidak jadi dibuat. Error: ' + pipelineErr.message
                    });
                }
            }

            // Generate QR Code
            const qrCodeBase64 = await QRCode.toDataURL(secret.otpauth_url);

            // Send email with QR Code
            try {
                const transporter = nodemailer.createTransport({
                    host: 'mail.laundryqris.com',
                    port: 465,
                    secure: true,
                    auth: { user: 'noreplay@laundryqris.com', pass: 'sunterbahari123*' },
                    tls: { rejectUnauthorized: false }
                });

                await transporter.sendMail({
                    from: '"ELQIOS" <noreplay@laundryqris.com>',
                    to: email,
                    subject: 'Aktivasi Google Authenticator - ELQIOS',
                    html: `
                        <h3>Selamat datang di ELQIOS, ${display_name}!</h3>
                        <p>Akun Anda telah dibuat. Scan QR code berikut di aplikasi Google Authenticator:</p>
                        <img src="${qrCodeBase64}" alt="QR Code" />
                        <p><strong>Secret Key (manual):</strong> ${secretId}</p>
                        <p>Gunakan kode OTP dari Google Authenticator saat login ke dashboard web.</p>
                        <hr>
                        <p style="color:#666;font-size:12px;">Email ini dikirim otomatis oleh sistem ELQIOS.</p>
                    `
                });
                console.log(`✅ QR Code email sent to ${email}`);
            } catch (emailErr) {
                console.error('Email send error:', emailErr.message);
                // User tetap dibuat meskipun email gagal
            }

            return res.json({ status: 'OK', message: 'User berhasil dibuat dan QR Code dikirim ke email', data: { UserId: newUserId } });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }

    async resetPassword(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            let enc = new Encrypt();
            const { user_id, new_password } = req.body;

            if (!user_id || !new_password) return res.json({ status: 'ERROR', message: 'user_id dan password wajib' });
            if (new_password.length < 6) return res.json({ status: 'ERROR', message: 'Password minimal 6 karakter' });

            const encPassword = enc.EncryptAES(new_password, config.encKey);
            await esql.sqlQuery('UPDATE users SET Password = ? WHERE UserId = ?', [encPassword, user_id]);
            return res.json({ status: 'OK', message: 'Password berhasil direset' });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }
    async generate2FA(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            const { user_id, email } = req.body;
            if (!user_id || !email) {
                return res.json({ status: 'ERROR', message: 'user_id dan email wajib diisi' });
            }

            let esql = new Esql();

            // Get user info
            const userResult = await esql.sqlQuery('SELECT UserId, DisplayName, MobilePhone FROM users WHERE UserId = ? AND IsActive = 1', [user_id]);
            const user = userResult && userResult[0] ? userResult[0] : null;
            if (!user) return res.json({ status: 'ERROR', message: 'User tidak ditemukan' });

            // Generate TOTP secret
            const speakeasy = require('speakeasy');
            const QRCode = require('qrcode');

            const secret = speakeasy.generateSecret({
                name: `ELQIOS (${user.DisplayName})`,
                issuer: 'ELQIOS'
            });

            // Save secret to database
            try {
                await esql.sqlQuery('UPDATE users SET SecretId = ? WHERE UserId = ?', [secret.base32, user_id]);
            } catch(dbErr) {
                console.error('Save SecretId error:', dbErr);
            }

            // Generate QR code as data URL
            const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

            // Try send email (non-blocking jika gagal)
            let emailSent = false;
            try {
                const nodemailer = require('nodemailer');
                const smtpSecure = process.env.SMTP_SECURE === 'true';
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'mail.laundryqris.com',
                    port: parseInt(process.env.SMTP_PORT || '465'),
                    secure: smtpSecure,
                    auth: {
                        user: process.env.SMTP_USER || 'noreplay@laundryqris.com',
                        pass: process.env.SMTP_PASS
                    },
                    tls: { rejectUnauthorized: false }
                });

                await transporter.sendMail({
                    from: `"ELQIOS" <${process.env.SMTP_USER}>`,
                    to: email,
                    subject: 'Setup Google Authenticator - ELQIOS',
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                            <h2 style="color:#1e293b;">Setup Google Authenticator</h2>
                            <p>Halo <strong>${user.DisplayName}</strong>,</p>
                            <p>Scan QR code berikut menggunakan aplikasi Google Authenticator:</p>
                            <div style="text-align:center;margin:20px 0;">
                                <img src="${qrDataUrl}" alt="QR Code" style="width:200px;height:200px;">
                            </div>
                            <p style="font-size:12px;color:#64748b;">Atau masukkan kode manual: <strong>${secret.base32}</strong></p>
                            <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;">
                            <p style="font-size:11px;color:#94a3b8;">Email ini dikirim otomatis oleh sistem ELQIOS.</p>
                        </div>
                    `
                });
                emailSent = true;
            } catch(mailErr) {
                console.error('Send email error:', mailErr.message);
            }

            const message = emailSent
                ? 'QR Code berhasil digenerate dan dikirim ke email'
                : 'QR Code berhasil digenerate (email gagal terkirim, silakan screenshot QR)';

            return res.json({
                status: 'OK',
                message,
                data: { qr_image: qrDataUrl, secret_key: secret.base32 }
            });

        } catch (err) {
            console.error('generate2FA error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || 'Internal server error' });
        }
    }
    async resend2FA(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            const { user_id, email } = req.body;
            if (!user_id || !email) {
                return res.json({ status: 'ERROR', message: 'user_id dan email wajib diisi' });
            }

            let esql = new Esql();

            // Get user info + existing secret
            const userResult = await esql.sqlQuery('SELECT UserId, DisplayName, SecretId FROM users WHERE UserId = ? AND IsActive = 1', [user_id]);
            const user = userResult && userResult[0] ? userResult[0] : null;
            if (!user) return res.json({ status: 'ERROR', message: 'User tidak ditemukan' });
            if (!user.SecretId) return res.json({ status: 'ERROR', message: 'User belum memiliki 2FA secret. Generate terlebih dahulu.' });

            // Rebuild QR from existing secret
            const speakeasy = require('speakeasy');
            const QRCode = require('qrcode');

            const otpauthUrl = speakeasy.otpauthURL({
                secret: user.SecretId,
                label: `ELQIOS (${user.DisplayName})`,
                issuer: 'ELQIOS',
                encoding: 'base32'
            });

            const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

            // Send email
            let emailSent = false;
            try {
                const nodemailer = require('nodemailer');
                const smtpSecure = process.env.SMTP_SECURE === 'true';
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'mail.laundryqris.com',
                    port: parseInt(process.env.SMTP_PORT || '465'),
                    secure: smtpSecure,
                    auth: {
                        user: process.env.SMTP_USER || 'noreplay@laundryqris.com',
                        pass: process.env.SMTP_PASS
                    },
                    tls: { rejectUnauthorized: false }
                });

                await transporter.sendMail({
                    from: `"ELQIOS" <${process.env.SMTP_USER || 'noreplay@laundryqris.com'}>`,
                    to: email,
                    subject: 'QR Code Google Authenticator - ELQIOS',
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                            <h2 style="color:#1e293b;">Google Authenticator</h2>
                            <p>Halo <strong>${user.DisplayName}</strong>,</p>
                            <p>Berikut QR code untuk setup Google Authenticator Anda:</p>
                            <div style="text-align:center;margin:20px 0;">
                                <img src="${qrDataUrl}" alt="QR Code" style="width:200px;height:200px;">
                            </div>
                            <p style="font-size:12px;color:#64748b;">Atau masukkan kode manual: <strong>${user.SecretId}</strong></p>
                            <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;">
                            <p style="font-size:11px;color:#94a3b8;">Email ini dikirim otomatis oleh sistem ELQIOS.</p>
                        </div>
                    `
                });
                emailSent = true;
            } catch(mailErr) {
                console.error('Resend 2FA email error:', mailErr.message);
            }

            const message = emailSent
                ? 'QR Code berhasil dikirim ke email'
                : 'Gagal mengirim email (QR ditampilkan di halaman)';

            return res.json({
                status: emailSent ? 'OK' : 'ERROR',
                message,
                data: { qr_image: qrDataUrl }
            });

        } catch (err) {
            console.error('resend2FA error:', err);
            return res.status(500).json({ status: 'ERROR', message: err.message || 'Internal server error' });
        }
    }

    async unlockUser(req, res) {
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let tokenResult = bearer.responseToken(this.token);
        if (tokenResult.status !== 'OK') return res.json(tokenResult);

        try {
            let esql = new Esql();
            const { user_id } = req.body;

            if (!user_id) return res.json({ status: 'ERROR', message: 'user_id wajib diisi' });

            // Set IsLogin = 0 and IsLock = 0
            await esql.sqlQuery(
                'UPDATE users SET IsLogin = 0, IsLock = 0 WHERE UserId = ?',
                [user_id]
            );

            return res.json({ status: 'OK', message: 'User berhasil di-unlock' });
        } catch (err) {
            return res.status(500).json({ status: 'ERROR', message: err.message });
        }
    }
}

module.exports = UserAdminModel;
