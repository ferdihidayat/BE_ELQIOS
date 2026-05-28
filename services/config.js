const fs = require('fs')
const certificate = './server-ca.crt';

const DBauth = {
    //socketPath: '/cloudsql/iforte-android:asia-southeast1:dev-ifortemysql',
    connectionLimit: 20,
    user: 'lauj8643_dev',
    password: 'Sunter2168*',
    database: 'lauj8643_laundryqris',
    host: 'localhost',
    port: '3306',
    // ssl: {
    //     ca: fs.readFileSync(certificate)
    // }
}



const encKey = 'iQqhyovNo1';
const clientId = 'e405f230-24b0-4247-bc81-819e5223b992';
const hashKey = 'b3154acf3a344170077d11bdb5fff31532f679a1919e716a02';
const expiresIn = '24h';


const onesignal = {
    host: 'https://onesignal.com/api/v1/notifications',
    restapi: 'YTM3ZTI2MGYtYmNkZi00ZmRmLTlmNzctNDlhNWYxZGE2ZGMx',
    appid: '71562321-fda4-4b9b-8974-396a9d47a0f9',
};

const jwtAlgorithm = {
    HashingAlgorithm: 'HS256',
    tokenType: 'Bearer ',
    keyBase22: 'f7e5d8d4-a645-4839-b39c-05c1c59467cd',
}

const firebaseKey = {
    baseUrl: 'https://marketing-service-cecd2.firebaseio.com',
    token: 'AAAAq_Qwu1o:APA91bGIRYjKnhGZnnEZJhS4E_HExOpiZHs3O2nf1QrNYBta6b1Hn6QPLS_eXzREt8z3Lh6H4d1BEVokPwzVIBeU8TDzuELHRcKYqwIwFScEO_h3sevOg7vP412NYAdeAZzRWskmojDu'
}

const smtp = {
        service: 'smtp.laundryqris.com', // atau gunakan SMTP dari Rumahweb
        subject: 'OTP SSO Client Google Authenticator',
        email: 'lauj8643@laundryqris.com',
        pass: 'trMvXCqtBi3E61',
    };
const gmail = {
    user: 'Apps@iforte.co.id',
    pass: 'projectiforte2020#'
}

const service_payment = {
    base_url : 'https://api.midtrans.com/v2/'
    //base_url : 'https://api.sandbox.midtrans.com/v2/'
}

const mqttOptions = {
    host: '45cd437ceadc40808ad4b4576d617a3a.s1.eu.hivemq.cloud',
    port: 8883,
    protocol: 'mqtts',
    username: 'hivemq.webclient.1731649490542',
    password: 'w#ZBLar:@A3bq,QR258c'
}
module.exports = { DBauth, encKey, clientId, hashKey, expiresIn, jwtAlgorithm, smtp, gmail, onesignal,service_payment,mqttOptions };