const Esql = require('../helpers/entity.js')
const Auth = require('../helpers/auth.js')
const uuid = require('../helpers/uuid.js')
const encrypt = require('../helpers/encrypt.js')
const config = require('../config.js')
const query = require('../query/query.js')
const _ = require('lodash')


class SignModel {
    constructor() {
        // this.token = token;
    }

    async signUp(req,res) {
        let esql = new Esql();
        let __sp_signUp = query.sp_signUp;
        let __uuid = new uuid().version4();
        // let __auth = new Auth();
        // let __enc = new encrypt();
            //  console.log('signup kuy',JSON.stringify(req.body));

        let _result = { status:'ERROR',message: 'param mandatory' };
             
        if(req.body.display_name == undefined || req.body.display_name.length == 0 ) 
            _result = { status:'ERROR',message: 'name tidak boleh kosong' }
        else if(req.body.pin == undefined || req.body.pin.length == 0 ) 
            _result = { status:'ERROR',message: 'password tidak boleh kosong' }
        else if(req.body.mobile_phone == undefined || req.body.mobile_phone.length == 0 ) 
            _result = { status:'ERROR',message: 'HP tidak boleh kosong' }                                                   
        else {
            // var _secretId =  __auth.sendEmailQrCode(req.body.email);
            var response = await esql.sqlProcedure(__sp_signUp,[req.body.display_name,req.body.pin,req.body.mobile_phone,__uuid]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { 
                status: response[0].status,
                message: response[0].status == 'OK' ? 'success' : response[0].message, 
                data : response[0].status == 'OK' ? 
                {
                    user_id: response[0].user_id,
                    mobile_phone: req.body.mobile_phone,
                    display_name: req.body.display_name,  
                    uuid: __uuid,
                    role_id:  4,
                    get_data: 0,
                    is_login:  0
                } : {} 
            };

        }
        res.json(_result);
    }

    async signIn(req,res) {
        let esql = new Esql();
        let __auth = new Auth();
        let __enc = new encrypt();
        let __signIn = query.sp_signIn;        
        // let bearer = new Auth(config.jwtAlgorithm.tokenType);
        let _result = { status:'ERROR',message: 'param mandatory' };
                      
                if(!req.body.mobile_phone.length || req.body.mobile_phone == undefined)
                    _result = { status:'ERROR',message: 'Nomor HP tidak boleh kosong' };
                else if(!req.body.pin.length || req.body.pin == undefined)
                    _result = { status:'ERROR',message: 'password tidak boleh kosong' };
                else if(!req.body.apk_version.length || req.body.apk_version == undefined)
                    _result = { status:'ERROR',message: 'apk version tidak boleh kosong' };
                else{                    
                    var response = await esql.sqlProcedure(__signIn,[req.body.mobile_phone,req.body.apk_version]);
                    
                    if(response[0].status == 'OK'){
                        // console.log('__',JSON.stringify(response[0].pwd)); 
                        if(__enc.DecyptAES(response[0].pwd,config.encKey) != __enc.DecyptAES(req.body.pin,config.encKey))
                            _result = { status:'ERROR',message: 'password salah' };
                        else if(response[0].is_login && response[0]?.role_id !== 7 && response[0]?.role_id !== 5)
                            _result = { status:'ERROR',message: 'user sedang login pada device lain' };
                        else{
                        // if(response[0].status == 'OK')
                        //     __auth.verifySSO(response.email);
                        // console.log(JSON.stringify(response));
                        
                        // if(__auth)
                        const __updateSignIn = query.updateSignIn;
                        const __isUpdate = await esql.sqlQuery(__updateSignIn,[req.body.mobile_phone,response[0].uuid]);
                        var data = {
                            user_id: response[0].user_id,
                            mobile_phone: req.body.mobile_phone,
                            display_name: response[0].display_name,
                            email: response[0].email,
                            uuid:  response[0].uuid,
                            payload_id: response[0].payload_id,
                            role_id: response[0].role_id,
                            outlet_code:response[0].outlet_code,
                            outlet_typeId:response[0].outlet_typeId,
                            get_data: 0,
                            is_login: 1
                        }
                        _result = { status:response[0].status,message: response[0].message, data: data }

                        }
                    }
                    
               
            
                }
               
        //  console.log('__',JSON.stringify(_result));    
         
        res.json(_result);        
    }


    async signInWeb(req, res) {
        let esql = new Esql();
        let __auth = new Auth(config.jwtAlgorithm.tokenType);
        let __enc = new encrypt();
        let __signIn = query.sp_signIn;
        let _result = { status: 'ERROR', message: 'param mandatory' };

        const { mobile_phone, pin } = req.body;

        if (!mobile_phone || !mobile_phone.length)
            _result = { status: 'ERROR', message: 'Nomor HP tidak boleh kosong' };
        else if (!pin || !pin.length)
            _result = { status: 'ERROR', message: 'Password tidak boleh kosong' };
        else {
            var response = await esql.sqlProcedure(__signIn, [mobile_phone, 'WEB']);

            if (response[0].status !== 'OK') {
                _result = { status: 'ERROR', message: response[0].message || 'Login gagal' };
            } else {
                // Validasi PIN — pin dari FE adalah plain text, pwd dari DB adalah encrypted
                if (__enc.DecyptAES(response[0].pwd, config.encKey) !== pin) {
                    _result = { status: 'ERROR', message: 'Password salah' };
                }
                // Hanya role 1 (admin), 2, 3, 5, 6, 8 yang boleh login web
                else if (![1, 2, 3, 5, 6, 8].includes(response[0].role_id)) {
                    _result = { status: 'ERROR', message: 'Akun tidak memiliki akses ke dashboard web' };
                }
                else {
                    // Update status login
                    const __updateSignIn = query.updateSignIn;
                    await esql.sqlQuery(__updateSignIn, [mobile_phone, response[0].uuid]);

                    // Check if user has 2FA secret
                    const [userSecret] = await esql.sqlQuery('SELECT SecretId FROM users WHERE MobilePhone = ? AND IsActive = 1', [mobile_phone]);
                    const has2fa = !!(userSecret && userSecret.SecretId);

                    // Generate JWT token
                    const userData = {
                        user_id: response[0].user_id,
                        mobile_phone,
                        display_name: response[0].display_name,
                        email: response[0].email,
                        uuid: response[0].uuid,
                        payload_id: response[0].payload_id,
                        role_id: response[0].role_id,
                        outlet_code: response[0].outlet_code,
                        outlet_typeId: response[0].outlet_typeId,
                        is_login: 1,
                        has_2fa: has2fa
                    };

                    const token = __auth.requestToken(JSON.stringify(userData), config.expiresIn);

                    _result = {
                        status: 'OK',
                        message: 'Login berhasil',
                        token,
                        data: userData
                    };
                }
            }
        }

        res.json(_result);
    }

    async signOut(req,res) {
        let esql = new Esql();
        let __signOut = query.sp_signOut;        
        let _result = { status:'ERROR',message: 'param mandatory' };
                
                if(req.body.mobile_phone == undefined && req.body.uuid == undefined)
                    _result = { status:'ERROR',message: 'not referance x0002' };
                else if(req.body.mobile_phone == '' && req.body.uuid == '')
                    _result = { status:'ERROR',message: 'not referance x0002' };
                else{
                    
                var response = await esql.sqlProcedure(__signOut,[req.body.mobile_phone,req.body.uuid]);
                _result = { status:'OK',message: response[0].message } 
            }
         
        res.json(_result);        
    }


}

module.exports = SignModel;