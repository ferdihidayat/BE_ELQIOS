const config = require('../config.js');
const jwt = require('jsonwebtoken');

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const nodemailer = require('nodemailer');

// Generate secret

class BearerToken {
    constructor(tokenType) {
        this.tokenType = tokenType
    }

 
    /**======================================================================================
     * @desc requestToken using SHA-256 hash algorithm
     * @example : 
     * requestToken(
     * request : data, 
     * expiresIn = '3s', '3h','3d','3m')//{ algorithm: 'RS256'}--Config.keyBase22 : secret key
     ==========================================================================================*/
    requestToken(request, expiresIn = '') {
        
        let gen = request;
        // console.log('request', JSON.stringify(gen));
        let __token = jwt.sign({ gen }, config.jwtAlgorithm.keyBase22, { expiresIn, algorithm: config.jwtAlgorithm.HashingAlgorithm });

        return __token;
    }

    responseToken(token) {

        try {

            var __token = {};

            __token = jwt.verify(token, config.jwtAlgorithm.keyBase22, { algorithm: config.jwtAlgorithm.HashingAlgorithm });

            return {status:'OK', message:{exp:__token.exp}};

        } catch (error) {            

            return {status:'ERROR', message:error};
        }


    }

    sendEmailQrCode(to){
        const secret = speakeasy.generateSecret({ name: to });

        // Generate QR code
        qrcode.toDataURL(secret.otpauth_url, async (err, data_url) => {
            if (err) throw err;
            // Kirim QR code via email
            let transporter = nodemailer.createTransport({
                service: config.smtp.service, // atau gunakan SMTP dari Rumahweb
                auth: {
                user: config.smtp.email,
                pass: config.smtp.pass,
                },
            });
            await transporter.sendMail({
                from: 'no-replay',
                to: to,
                subject: config.smtp.subject,
                html: `<p>Scan QR code di bawah ini dengan Google Authenticator:</p><img src="${data_url}" />`,
            });
            console.log('QR code sent to email');
        });
        return secret;
    }

    verifySSO(secret, otp){        
        const isVerified = speakeasy.totp.verify({
        secret: secret, // simpan secret saat generate
        encoding: 'base32',
        token: otp, // kode OTP dari user
        window: 1, // toleransi waktu
        });

        return isVerified;
    }

}


module.exports = BearerToken;