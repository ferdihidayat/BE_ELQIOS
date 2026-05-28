// import { SimpleEncryption,UnixID } from '../helpers/index.js';
const config = require('../config.js')
const simpleEncryption = require('../helpers/encrypt.js')
const auth = require('../helpers/auth.js')
const UnixID = require('../helpers/uuid.js')
const users = require('../model/users.js')


class Atuh_Common {
    constructor() { }
    
    async genBase64(req,res){
      const base64Key = Buffer.from(`${req.body.serverKey}:`).toString('base64'); 
      let _res = {
            status: 'OK',
            message: base64Key
        }

        res.json(_res);
    }

    async encrypt(req,res){
        const _text = req.body.text;
        let SimpleEncryption = new simpleEncryption();
        let _enc = SimpleEncryption.EncryptAES(_text, config.encKey);
        let _index = _enc.indexOf('/');

        // console.log('1.',_enc);

     
        if (_index > 0)
        loop1:
        for (var i = 0; i < 10; i++) {
            _enc = SimpleEncryption.EncryptAES(_text, config.encKey);
            _index = _enc.indexOf('/');
            if (_index > 0) {
              continue loop1;
            }
            break;
           }

        //    console.log('2.',_enc);

        let _res = {
            status: 'OK',
            // index: _index,
            message: _enc
        }

        res.json(_res);
    }

    async decrypt(req,res){
        const _text = req.body.text;
        let SimpleEncryption = new simpleEncryption();
        const _enc = SimpleEncryption.DecyptAES(_text, config.encKey);
        // console.log(_text);
        let _res = {
            status: 'OK',
            message: _enc
        }

        res.json(_res);
    }

    async generateUUID(res){
        let _uuid = new UnixID().version4();
        
        let _res = {
            status: 'OK',
            message: _uuid
        }

        res.json(_res);
    }

    async getToken(req,res){
        let Auth = new auth();
        let __token = '';
        let _res = {
            status: 'ERROR',
            message: 'failed generate token'
        }

        
        if(req.headers.regkey == config.encKey){
            const __users = await new users().getUserByCode(req.body.clientId);
            // console.log('__token',JSON.stringify(__users.message[0].counter)); 
            if(parseInt(__users.message[0].counter)){
                __token = Auth.requestToken(JSON.stringify(req.body),config.expiresIn);

                _res = {
                status: __token != '' ? 'OK' : 'ERROR',
                message: __token != '' ? __token : 'failed generate token'
                }
            }                        
        }
        

        

        res.json(_res);
    }

    async checkToken(req,res){
        let Auth = new auth();
        res.json(Auth.responseToken(req.body.token));


    }

    async checkIsLogin(req,res){
        const __users = await new users().getUserByCode(req.body.clientId);
        let _res = {
            status: 'ERROR',
            message: 'user failed'
        }

        if(parseInt(__users.message[0].counter)){

            _res = {
            status: 'OK',
            message: ''
            }
        } 

        res.json(_res);
    }

}

module.exports = Atuh_Common;