
import { query_text, query_setLogin, query_setLogout, query_payloadId } from './query'
const moment = require('moment');
const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const SimpleEncryption = require('../helpers/encrypt.js')
const config = require('../config.js')


const encrypt = SimpleEncryption();

class Login_model {
    constructor(token) {
        this.token = token;
    }


    async Login(userid = '', password = '', device_id = '', brand = '', ip_address = '') {

        let esql = Esql()
        let Query = query_setLogin;

        try {
                

            
                let bearer = BearerToken(config.jwtAlgorithm.tokenType);
                let _text = `${userid}|${device_id}|${ip_address}`;

                console.log(_text)
                let token = bearer.requestToken(_text, '1m')
                let res = await esql.sqlProcedure(Query, [userid, password, device_id, brand, ip_address, token]);

                var response = res.map((res) => {
                    return {
                        id: res.id,
                        userid: res.user_id,
                        username: res.full_name,
                        email: res.email,
                        nik: res.nik,
                        mobile: res.mobile,
                        job_position: res.position_id,
                        next_approval_id: res.next_approval_id,
                        next_approval_name: res.next_approval_name,
                        next_approval_email: res.next_approval_email,
                        role: res.role,
                        agent: res.agent,
                        deviceid: res.deviceid,
                        ipaddress: res.ip_address,
                        create_date: `${moment.utc(res.create_date, 'YYYY-MM-DD').format("DD-MM-YYYY")} ${moment.utc(res.create_date).format("HH:mm:ss")}`
                    }
                })

                return { response, token };
            


        } catch (error) {
            console.error(error);
        }

    }

    // async is_login(userid, deviceid) {

    //     let esql = Esql()
    //     let whereCond = userid ? `WHERE a.username ='${userid}' AND a.deviceid='${deviceid}'` : '';
    //     let Query = `${query_text} ${whereCond}`;

    //     let res = await esql.sqlQuery(Query);

    //     if (res.length) {
    //         let bearer = BearerToken(config.jwtAlgorithm.tokenType);
    //         let is_token = bearer.responseToken(this.token);
    //         let token_generate = '';
    //         let _text = `${res[0].user_id}|${res[0].full_name}|${res[0].create_date}`;
    //         let msgError = '';
    //         let UpdateLogout = query_setLogout;


    //         if (is_token.gen == undefined) {

    //             if (res[0].is_login) {
    //                 token_generate = bearer.requestToken(_text, '1h')
    //                 // setLogin = await esql.sqlQuery(UpdateLogin,[userid, password, device_id, agent, ip_address, description])
    //             }
    //             else {
    //                 msgError = token_generate.name ? token_generate.name : `userid ${userid} is logout`;
    //                 setLogout = await esql.sqlProcedure(UpdateLogout, [userid, deviceid]);

    //             }

    //         }
    //         if (!res[0].is_login)
    //             msgError = `userid ${userid} is logout`;

    //         console.log('is_login: ', JSON.stringify(res[0].is_login))


    //         var response = {
    //             token: token_generate,
    //             msgError: msgError
    //             // email: res.email
    //         }

    //         return response;
    //     }
    //     else {
    //         var response = {
    //             token: '',
    //             msgError: 'data not found'
    //             // email: res.email
    //         }



    //         return response;
    //     }

    // }

    async logout(userid, deviceid) {
        try {

            let esql = Esql()
            let Query = query_setLogout;
            let res = await esql.sqlProcedure(Query, [userid, deviceid]);

            let msgError = '';

            if (!res.length)
                msgError = 'user not found';

            var response = {
                msgError: msgError
            }


            console.log('userid: ', JSON.stringify(res))
            return response;

        } catch (error) {

            var response = {
                msgError: error
            }

            return response;
        }
    }

    async setPayload(body) {
        try {

            let esql = Esql()
            let Query = query_payloadId;
            let res = await esql.sqlProcedure(Query, [body.userid, body.deviceid, body.payload_id]);

            console.log('setPayload: ', JSON.stringify(res))
            let msgError = '';

            if (!res.length)
                msgError = 'user not found';

            var response = {
                msgError: msgError
            }

            return response;

        } catch (error) {

            var response = {
                msgError: error
            }

            return response;
        }
    }

}

module.exports = Login_model;