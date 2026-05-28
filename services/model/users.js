const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js');
const encrypt = require('../helpers/encrypt.js');
const config = require('../config.js');
const query = require('../query/query.js')
const _ = require('lodash')



class UsersModel {
    constructor(token = '') {
        this.token = token;
    }

    async getUserByCode(clientId) {
        let esql = new Esql();
        let _users = query.usersByCode;
        let _result = { status:'ERROR',message: 'param mandatory' };
            
             var response = await esql.sqlQuery(_users,clientId);
            
                // if(response.counter)
                _result = { status:'OK',message: response }  
           
        return _result;     
    }

    async setPlayerId(req,res) {
        let esql = new Esql();
        let _users = query.SP_SetPayloadId;
        let _result = { status:'ERROR',message: 'token failed' };
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);
        _result = token

        const { mobile_phone, uuid, payloadId } = req.body;
        
        // console.log('token',JSON.stringify(req.body))
        if (token.status == 'OK'){
            _result = { status:'ERROR',message: 'param mandatory' };

            if(mobile_phone.length == 0 || mobile_phone == undefined)
             _result = { status:'ERROR',message: 'mobile_phone tidak boleh kosong' };
            if(uuid.length == 0 || uuid == undefined)
             _result = { status:'ERROR',message: 'uuid tidak boleh kosong' };
            if(payloadId.length == 0 || payloadId == undefined)
             _result = { status:'ERROR',message: 'payloadId tidak boleh kosong' };

         var response = await esql.sqlProcedure(_users,[mobile_phone,uuid,payloadId]);
        
            _result = { status:'OK',message: response };
        }

        res.json(_result); 
    }
    
    async getPlayerIdWd103347(res) {
        let esql = new Esql();
        let _users = query.getPayloadWd;
        let _result = { status:'ERROR',message: 'token failed' };
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);
        _result = token

        if (token.status == 'OK'){

         var response = await esql.sqlQuery(_users,[]);
        
            _result = { status:'OK',message: response };
        }

        res.json(_result); 
    }
    
    async setUserPin02435(req,res) {
        let esql = new Esql();
        let _userPin = query.SP_SetUserPin;
        let _result = { status:'ERROR',message: 'token failed' };
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);
        _result = token

        const { mobile_phone,clientId, pin } = req.body;
        
        // console.log('token',JSON.stringify(req.body))
        if (token.status == 'OK'){
            _result = { status:'ERROR',message: 'param mandatory' };

            if(mobile_phone.length == 0 || mobile_phone == undefined)
             _result = { status:'ERROR',message: 'Number tidak boleh kosong' };
            if(clientId.length == 0 || clientId == undefined)
             _result = { status:'ERROR',message: 'secret id tidak boleh kosong' };
            if(pin.length == 0 || pin == undefined)
             _result = { status:'ERROR',message: 'pin set tidak boleh kosong' };
            

         var response = await esql.sqlProcedure(_userPin,[mobile_phone,clientId,pin]);
        
            _result = { status:'OK',message: response };
        }

        res.json(_result); 
    }
    
    async changePassword0211254(req,res) {
        let esql = new Esql();
        let __enc = new encrypt();
        let __user = query.cekPassword;    
        let __changePassword = query.SP_ChangePassword;        
        let _result = { status:'ERROR',message: 'param mandatory' };
        const {user_id, uuid, old_password, new_password } = req.body;
                
                if(user_id.length == 0 && user_id == undefined)
                    _result = { status:'ERROR',message: 'not referance xE001' };
                else if(uuid.length == 0 && uuid == '')
                    _result = { status:'ERROR',message: 'not referance xE002' };
                else if(old_password.length == 0 && old_password == '')
                    _result = { status:'ERROR',message: 'not referance xE003' };
                else if(new_password.length == 0 && new_password == '')
                    _result = { status:'ERROR',message: 'not referance xE004' };
                else{
                    _result = { status:'ERROR',message: 'Password Salah' };
                    let response = await esql.sqlQuery(__user,[user_id,uuid]);
                    _result = { status:'ERROR',message: 'Password Salah ' + __enc.DecyptAES(response[0].pwd,config.encKey) };
                    if(__enc.DecyptAES(response[0].pwd,config.encKey) == __enc.DecyptAES(old_password,config.encKey)){
                        response = await esql.sqlProcedure(__changePassword,[user_id,uuid,new_password]);
                        // console.log(JSON.stringify(response));
                        _result = { status:'OK',message: response[0].message } 
                    }
                                        
            }
         
        res.json(_result);        
    }


}

module.exports = UsersModel;