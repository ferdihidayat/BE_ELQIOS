const ServiceCore = require('./servicecore');
const Esql = require('../helpers/entity.js');
const query = require('../query/query.js');
require('dotenv').config();

class InternalServiceHelper extends ServiceCore {
    constructor(url, tokenType) {
        super(url);
        this.url = url;
        this._tokenType = tokenType;
    }

    _tokenType = '';

    async midtransCharge(body) {
        const MID = process.env.SERVERKEY;
        if (body == null)
            body = {};
        const __outlet_code = body?.transaction_details?.outlet_id;
        
        const __getMid =  await this.getApiKey(__outlet_code);
        const __apiKey = __getMid?.[0]?.ServerKey || MID;
        // console.log('__apiKey',__apiKey);
        const apiKey = this.generateMidtransAuth(__apiKey);        
        
        var header = {
            "Accept": 'application/json',
            "Content-Type": 'application/json; charset=utf-8',
            // "Accept-Encoding": "gzip",
            "Authorization": `Basic ${apiKey}`
        };
       
        return await super.Post(header, body);
    }

    async midtransOrderStatus(outlet_code) {
        const MID = process.env.SERVERKEY;
        const __getMid =  await this.getApiKey(outlet_code);
        const __apiKey = __getMid?.[0]?.ServerKey || MID;
        const apiKey = this.generateMidtransAuth(__apiKey);
        
        console.log('apiKey',apiKey);
        var header = {
            "Accept": 'application/json',
            "Content-Type": 'application/json; charset=utf-8',
            // "Accept-Encoding": "gzip",
            "Authorization": `Basic ${apiKey}`
        };
        // console.log(apiKey);
        // else
        //     header['X-Override-Notification'] = regKeys;
        
        return await super.Get(header);
    }

    async getToken(client_id) {
           
        var header = {
            "Accept": 'application/json',
            "Content-Type": 'application/json; charset=utf-8',
            "Accept-Encoding": "gzip"
        };

        var body = {
            "clientId": client_id
        };

        header['regkey'] = ENCKEY;

        return await super.Post(header, body);
    }
    
    
    async getApiKey(value) {
        let esql = new Esql();
        let __devices = query.getApiKeyMid;
        let response = [];

        try {
            if (!value) {
                console.log('getApiKey: value kosong');
                return [];
            }

            response = await esql.sqlQuery(__devices, [value]);

            console.log('getApiKey_function', JSON.stringify(response));
            return response;

        } catch (error) {
            console.error('getApiKey error:', error);
            return [];
        }
    }


    generateMidtransAuth(serverKey) {
    // Midtrans butuh format: ServerKey:
    const authString = `${serverKey}:`;
    return Buffer.from(authString).toString('base64');
    }
   
}

module.exports = InternalServiceHelper;
