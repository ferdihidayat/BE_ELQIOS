const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const config = require('../config.js')
const query = require('../query/query.js')
const _ = require('lodash')


class PaymentChargeModel {
    constructor() {
    }

    async setOrder(req) {
        let esql = new Esql();
        let Query = query.SP_Charge;
        let _result = { status:'ERROR',message: 'param mandatory' };

             var response = await esql.sqlProcedure(Query,
                    [
                        req.outlet_id,req.device_id,req.order_id,
                        req.gross_amount,req.payment_type,req.transaction_status,
                        req.qr_string,req.expiry_time,req.duration
                       
                    ]);

                _result = { status:'OK',message: response }  

        return _result;     
    }
    
    async setPaymentCallback(req) {
        let esql = new Esql();
        let Query = query.SP_HookMidtrans;
        let _result = { status:'ERROR',message: 'param mandatory' };            
             var response = await esql.sqlProcedure(Query,
                    [
                        req.order_id,req.gross_amount,req.payment_type,
                        req.transaction_status,req.settlement_time
                       
                    ]);
                
                _result = { status:'OK',message: response }  

        return _result;     
    }
    
    async setOrderStatus(req) {
        let esql = new Esql();
        let Query = query.SP_PayChargeTrx;
        let _result = { status:'ERROR',message: 'param mandatory' };

             var response = await esql.sqlProcedure(Query,
                    [
                        req.outlet_id,req.device_id,req.order_id,req.transaction_status
                       
                    ]);

                _result = { status:'OK',message: response }  

        return _result;     
    }
    
    async getOrderStatus_Esp32_2025(req,res) {
        let esql = new Esql();
        let __devices = query.orderStatus;
        let _result = { status:'ERROR',message: 'param mandatory' };
       
        if(req.query?.order_id !='' || req.query?.order_id != undefined){

            var response = await esql.sqlQuery(__devices,[req.query.order_id]);
            //  console.log('order_id',JSON.stringify(response));            
            _result = { status:'OK',message: 'success', data: response }  
        }

        res.json(_result);        
    }

    async setDevicePriceById(req,res) {
        let esql = new Esql();
        let Query = query.sp_updatePriceByDeviceId;
        let _result = { status:'ERROR',message: 'param mandatory' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
                if(req.body.device_id.length == 0 || req.body.device_id == undefined)
                    _result = { status:'ERROR',message: 'id device tidak boleh kosong' };
                else if(req.body.price_amount == 0 || req.body.price_amount == undefined)
                    _result = { status:'ERROR',message: 'price tidak boleh kosong' };
                else if(req.body.update_by == 0 || req.body.update_by == undefined)
                    _result = { status:'ERROR',message: 'insert tidak boleh kosong' };
                else{
                var response = await esql.sqlProcedure(Query,
                    [
                        req.body.device_id,req.body.price_amount,req.body.update_by
                    ]);
                _result = { status:'OK',message: response }  
                }
               
            }
            
        res.json(_result);        
    }

    async getDeviceByOutletId(req,res) {
        let esql = new Esql();
        let __devices = query.devicesByOutletId;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        _result = token
        console.log('_token',JSON.stringify(_result))
        if (token.status == 'OK'){
            
            _result = { status:'ERROR',message: 'param mandatory' };
            
            if(req.body.outlet_id !='' || req.body.outlet_id?.outlet_id != undefined){

            var response = await esql.sqlQuery(__devices,[req.body.outlet_id]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: response }  
            }
        
        }

        res.json(_result);        
    }


}

module.exports = PaymentChargeModel;