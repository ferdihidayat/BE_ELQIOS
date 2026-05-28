
const fetcher = require('../helpers/fetch');
const BearerToken = require('../helpers/auth.js');
const config = require('../config.js');
const models = require('../model/charge.js');
const moment = require('moment');

class Payment_Common {
    constructor(token) { 
        this.token = token;
    }

    async charge(req,res){
    let _res = {status: 'OK', message: 'token failed'};
    const __entity = new models();
    const __url = `${config.service_payment.base_url}charge`
    var _fetch = new fetcher(`${config.service_payment.base_url}charge`, '');
    let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
    let token = bearer.responseToken(this.token);        
    _res = token;
    console.log('req.body',JSON.stringify(req.body),__url)

    if (token.status == 'OK'){
            try {
                var bookingPay = await _fetch.midtransCharge(req.body);
                
                _res = {status: 'ERROR', message: 'Qris transaction is failed check your order id'};
                if (bookingPay.status_code == '201') {
                    _res = {
                        status: 'OK',
                        outlet_id: req.body.transaction_details.outlet_id,
                        device_id: req.body.transaction_details.device_id,
                        order_id: bookingPay.order_id,
                        gross_amount: bookingPay.gross_amount,
                        payment_type: bookingPay.payment_type,
                        transaction_status: bookingPay.transaction_status,
                        actions: bookingPay.actions[0].url,
                        qr_string: bookingPay.qr_string,
                        expiry_time: bookingPay.expiry_time,
                        duration: req.body?.transaction_details?.duration ? req.body?.transaction_details?.duration : 0
                    }
                }

                __entity.setOrder(_res);
            } catch(error) {
                _res = {status:'ERROR', message: error.message || error};
                return res.json(_res);   // ✅ return supaya tidak lanjut ke bawah
            }
        }

        return res.json(_res);   // ✅ hanya dieksekusi sekali
    }
    
    async charge20260204(req,res){
    let _res = {status: 'ERROR', message: 'Create charge failed'};
    const __entity = new models();
    const __url = `${config.service_payment.base_url}charge`
    var _fetch = new fetcher(`${config.service_payment.base_url}charge`, '');
    // let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
    // let token = bearer.responseToken(this.token); 
    // _res = token;
    // console.log('req.body',JSON.stringify(req.body),__url)

         try {

                var bookingPay = await _fetch.midtransCharge(req.body);
                
                _res = {status: 'ERROR', message: 'Qris transaction is failed check your order id'};
                if (bookingPay.status_code == '201') {
                    _res = {
                        status: 'OK',
                        outlet_id: req.body.transaction_details.outlet_id,
                        device_id: req.body.transaction_details.device_id,
                        order_id: bookingPay.order_id,
                        gross_amount: bookingPay.gross_amount,
                        payment_type: bookingPay.payment_type,
                        transaction_status: bookingPay.transaction_status,
                        actions: bookingPay.actions[0].url,
                        qr_string: bookingPay.qr_string,                        
                        expiry_time: bookingPay.expiry_time,
                        duration: req.body?.transaction_details?.duration ? req.body?.transaction_details?.duration : 0
                    }
                }
                
                __entity.setOrder(_res);

            } catch(error) {
                _res = {status:'ERROR', message: error.message || error};
                return res.json(_res);   // ✅ return supaya tidak lanjut ke bawah
            }

        return res.json(_res);   // ✅ hanya dieksekusi sekali
    }
    
    async midtransHook(req,res){
        let _res = {status: 'ERROR', message: 'token failed'};
        const __entity = new models();
        try{
            _res = {
                        order_id: req.body?.order_id,
                        gross_amount: parseFloat(req.body?.gross_amount),
                        payment_type: req.body?.payment_type,
                        transaction_status: req.body?.transaction_status,
                        settlement_time: req.body?.settlement_time
                    }
         if(req.body?.order_id.length == 0 || req.body?.order_id == undefined)
         __res = { status:'ERROR',message: 'order_id tidak boleh kosong' };
         else if(req.body?.transaction_status.length == 0 || req.body?.transaction_status == undefined)
         __res = { status:'ERROR',message: 'order_id tidak boleh kosong' };
         else
        __entity.setPaymentCallback(_res);
        
        }

        catch(error){
            _res = {status: 'ERROR', message: error.message};
        }
        return res.json(_res);
    }

    //PR UPDATE
    async pending_charge(req,res){
    let _res = {status: 'OK', message: 'token failed'};
    const __entity = new models();
    const __url = `${config.service_payment.base_url}charge`
    var _fetch = new fetcher(`${config.service_payment.base_url}charge`, '');
    let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
    let token = bearer.responseToken(this.token);        
    _res = token;
    console.log('req.body',JSON.stringify(req.body),__url)

    if (token.status == 'OK'){
            try {
                _res = {
                        status: 'OK',
                        outlet_id: req.body.outlet_id,
                        device_id: req.body.device_id,
                        order_id: req.body.order_id,
                        gross_amount: req.body.gross_amount,
                        payment_type: req.body.payment_type,
                        transaction_status: req.body.transaction_status,
                        actions: '',
                        qr_string: '',
                        expiry_time: moment().format('YYYY-MM-DD HH:mm:ss')
                    }
                __entity.setOrder(_res);
            } catch(error) {
                _res = {status:'ERROR', message: error.message || error};
                return res.json(_res);   // ✅ return supaya tidak lanjut ke bawah
            }
        }

        return res.json(_res);   // ✅ hanya dieksekusi sekali
    }


    async getPaymentStatus(req,res){
        let _res = {status: 'OK', message: 'token failed'};
        const __entity = new models();
        var _fetch = new fetcher(`${config.service_payment.base_url}${req.body.order_id}/status`,'');
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
            _res = token;

       if (token.status == 'OK'){

       var paymentstatus = await _fetch.midtransOrderStatus(req.body.outlet_id);
    //    console.log(JSON.stringify(paymentstatus));
       _res = {    
                    outlet_id: req.body.outlet_id,
                    device_id: req.body.device_id,                
                    order_id: req.body.order_id,
                    transaction_status: paymentstatus.transaction_status
                }

       if (paymentstatus.transaction_status === 'settlement')  __entity.setOrderStatus(_res);
    //    console.log(JSON.stringify(req.body));
       

        // __entity.setOrder(_res);
    }
       res.json(_res);
    }
    
    async getpaymentstatus20260204(req,res){
        let _res = {status: 'ERROR', message: 'failed'};
        const __entity = new models();
        var _fetch = new fetcher(`${config.service_payment.base_url}${req.body.order_id}/status`,'');
        

       try{
        var paymentstatus = await _fetch.midtransOrderStatus(req.body.outlet_id);
    //    console.log(JSON.stringify(paymentstatus));
       _res = {    
                    outlet_id: req.body.outlet_id,
                    device_id: req.body.device_id,                
                    order_id: req.body.order_id,
                    transaction_status: paymentstatus.transaction_status
                }

       if (paymentstatus.transaction_status === 'settlement')  __entity.setOrderStatus(_res);
       }
       catch(err){
        console.log(err.message);
       }

       res.json(_res);
    }

}



module.exports = Payment_Common;