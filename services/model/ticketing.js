const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const config = require('../config.js')
const query = require('../query/query.js')
const _ = require('lodash')


class TicketModel {
    constructor(token) {
        this.token = token;
    }

    async create(req,res) {
        let esql = new Esql();
        let Query = query.SP_CreateTicket;
        let _result = { status:'ERROR',message: 'param mandatory' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token

            const { status, data } = req.body;
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
                if(data.outlet_code.length == 0 || data.outlet_code == undefined)
                    _result = { status:'ERROR',message: 'Outlet tidak boleh kosong' };
                else if(data.device_code.length == 0 || data.device_code == undefined)
                    _result = { status:'ERROR',message: 'Device tidak boleh kosong' };
                else if(data.imagebase64.length == 0 || data.imagebase64 == undefined)
                    _result = { status:'ERROR',message: 'Bukti bayar tidak boleh kosong' };
                else if(data.remarks.length == 0 || data.remarks == undefined)
                    _result = { status:'ERROR',message: 'Remarks tidak boleh kosong' };
                
                else{
                var response = await esql.sqlProcedure(Query,
                    [
                        data.outlet_code,data.device_code,data.imagebase64,data.remarks
                    ]);
                _result = response[0];
                }
               
            }
            
        res.json(_result);        
    }


}

module.exports = TicketModel;