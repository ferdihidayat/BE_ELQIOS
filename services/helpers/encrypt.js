var CryptoJS = require('crypto-js');

class SimpleEncryption {
    constructor() { }


    EncryptAES(textToEnc, encKey) {
        var option = { mode: CryptoJS.mode.CBC };
        var encrypted = CryptoJS.AES.encrypt(textToEnc, encKey, option);

        return encrypted.toString();
    }

    DecyptAES(textToEnc, encKey) {
        var option = { mode: CryptoJS.mode.CBC };
        var bytes = CryptoJS.AES.decrypt(textToEnc, encKey, option);
        var decrypt = bytes.toString(CryptoJS.enc.Utf8);

        return decrypt.toString();
    }


    EncryptSHA1(textToEnc) {

        var encrypted = CryptoJS.SHA1(textToEnc);

        return encrypted.toString();
    }

    EncryptSHA256(textToEnc, encKey) {


        var encrypted = CryptoJS.HmacSHA256(textToEnc, encKey);

        return encrypted.toString();
    }

    encryptByTripleDES(message, encKey) {
        var keyHex = CryptoJS.enc.Utf8.parse(encKey);
        var encrypted = CryptoJS.TripleDES.encrypt(message, keyHex, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });

        return encrypted.toString();
    }


    decryptByTripleDES(ciphertext, encKey) {

        var keyHex = CryptoJS.enc.Utf8.parse(encKey);
        var decrypted = CryptoJS.TripleDES.decrypt({
            ciphertext: CryptoJS.enc.Base64.parse(ciphertext)
        }, keyHex, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });

        return decrypted.toString(CryptoJS.enc.Utf8);
    }
}

module.exports = SimpleEncryption;