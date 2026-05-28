const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const config = require('../config.js')
const query = require('../query/query.js')
const _ = require('lodash')



class OwnerModel {
   constructor(token) {
        this.token = token;
    }

  
    async getOwnerList(res) {
        let esql = new Esql();
        let _users = query.ownerList;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);
            _result = token
            
            console.log(JSON.stringify(token))
        if (token.status == 'OK'){
            console.log(JSON.stringify(token))
             var response = await esql.sqlQuery(_users);
            
                // if(response.counter)
                _result = { status:'OK',message: 'success', data: response };
        }

        res.json(_result);
          
    }
    
    async getOwnerOutletCode20260206001(req,res) {
        let esql = new Esql();
        let __outlet = query.userByOutletCode;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);
            _result = token

        const { device_code } = req.body;    
        
        if(device_code.length == 0 || device_code == undefined)
         _result = { status:'ERROR',message: 'device_code tidak boleh kosong' };
            
            // console.log(JSON.stringify(token))
        if (token.status == 'OK'){
            // console.log(JSON.stringify(token))
             var response = await esql.sqlQuery(__outlet,[device_code]);
            
                // if(response.counter)
                _result = { status:'OK',message: 'success', data: response }  
        }

        res.json(_result);
          
    }
    
    async messageBroker0211253(req,res) {
        const oneSignalMessageBroker = require('../helpers/message_broker.js')
        const axios = require('axios');
        let esql = new Esql();
        
        let __owner = query.VW_OwnerByOutletCode;
        let _result = { status:'ERROR',message: 'param mandatory' };
        
        const { outlet_code,message,sound } = req.body;    
        
        if(outlet_code.length == 0 || outlet_code == undefined)
         _result = { status:'ERROR',message: 'Number tidak boleh kosong' };
        else if(message.length == 0 || message == undefined)
         _result = { status:'ERROR',message: 'Message tidak boleh kosong' };
        else if(message == sound)
         _result = { status:'ERROR',message: 'sound kosong' };

        const response = await esql.sqlQuery(__owner,[outlet_code]);
    
        console.log('response',JSON.stringify(response));

        if(response[0]?.PayloadId) {
            let __oneSignal = new oneSignalMessageBroker([response[0]?.PayloadId]);
           await __oneSignal.sendPushToPlayer(message,sound);

            // Notify web dashboard via FE webhook (Socket.IO room by payload_id)
            try {
                await axios.post('http://localhost:3000/webhook/notify', {
                    payload_id: response[0].PayloadId,
                    outlet_code,
                    message
                }, { timeout: 3000 });
                console.log('✅ Web dashboard notified for:', response[0].PayloadId);
            } catch (webhookErr) {
                console.error('Webhook notify error:', webhookErr.message);
            }
        }

        _result = response[0];

        

        res.json(_result);        
    }


}

module.exports = OwnerModel;