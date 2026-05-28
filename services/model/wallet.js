const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const config = require('../config.js')
const query = require('../query/query.js')
const _ = require('lodash')


class WalletModel {
    constructor(token) {
        this.token = token;
    }

    async getWallet(req,res) {
        let esql = new Esql();
        let Query = query.walletAccount;
        let _result = { status:'ERROR',message: 'token failed' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token

            const { mobile_no } = req.body;
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
                if(mobile_no.length == 0 || mobile_no == undefined)
                    _result = { status:'ERROR',message: 'Mobile No tidak boleh kosong' };                
                
                else{
                var response = await esql.sqlQuery(Query,
                    [
                        mobile_no
                    ]);
                _result = response[0];
                }
               
            }
            
        res.json(_result);        
    }

    async getWithdrawal(req,res) {
        let esql = new Esql();
        let Query = query.withdrawalTrx;
        let _result = { status:'ERROR',message: 'token failed' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token

            const { mobile_no } = req.body;
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
                if(mobile_no.length == 0 || mobile_no == undefined)
                    _result = { status:'ERROR',message: 'Mobile No tidak boleh kosong' };                
                
                else{
                var response = await esql.sqlQuery(Query,
                    [
                        mobile_no
                    ]);
                _result = response;
                }
               
            }
            
        res.json(_result);        
    }


    async requestWithdrawal(req,res) {
        let esql = new Esql();
        let Query = query.SP_RequestWithdrawalTrx;
        let _result = { status:'ERROR',message: 'token failed' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token

            const { outlet_code, userid, amount } = req.body;
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                if(!userid || String(userid).length == 0)
                    _result = { status:'ERROR',message: 'account No tidak boleh kosong' };
                else if(!amount || String(amount).length == 0)
                    _result = { status:'ERROR',message: 'Amount tidak boleh kosong' };
                else{
                    // Check if there's a pending withdrawal (Status=1 means pending/request)
                    const [pendingWd] = await esql.sqlQuery(
                        'SELECT WithdrawalId FROM withdrawal_trx WHERE OwnerId = ? AND Status = 1 LIMIT 1',
                        [userid]
                    );
                    if (pendingWd) {
                        _result = { status: 'ERROR', message: 'Masih ada permintaan penarikan yang belum diproses. Silakan tunggu hingga disetujui atau ditolak.' };
                    } else {
                        var response = await esql.sqlProcedure(Query,[userid,amount]);
                        // SP returns: { status: 'OK', WithdrawalCode, SaldoAkhir } or { status: 'ERROR', message }
                        if (Array.isArray(response)) {
                            _result = response[0] || { status: 'OK', message: 'Berhasil' };
                        } else if (response && response.status) {
                            _result = response;
                        } else {
                            _result = { status: 'OK', message: 'Permintaan penarikan berhasil', data: response };
                        }

                        // Update OutletCode on the newly created withdrawal record
                        if (_result && _result.status === 'OK' && _result.WithdrawalCode) {
                            let outletCode = outlet_code || '';
                            // If outlet_code not provided, get it from outlet with highest saldo
                            if (!outletCode) {
                                const [outletRow] = await esql.sqlQuery(
                                    'SELECT OutletCode FROM outlet WHERE OwnerId = ? AND IsActive = 1 ORDER BY Saldo DESC LIMIT 1',
                                    [userid]
                                );
                                if (outletRow) outletCode = outletRow.OutletCode;
                            }
                            if (outletCode) {
                                await esql.sqlQuery(
                                    'UPDATE withdrawal_trx SET OutletCode = ? WHERE WithdrawalCode = ?',
                                    [outletCode, _result.WithdrawalCode]
                                );
                            }
                        }
                    }
                }
               
            }
            
        res.json(_result);        
    }
    
    async disbursementList(req,res) {
        let esql = new Esql();
        let Query = query.withdrawalNeedApproval;
        let _result = { status:'ERROR',message: 'token failed' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token

            const { user_id } = req.body;
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
                if(user_id.length == 0 || user_id == undefined)
                    _result = { status:'ERROR',message: 'Parameter tidak boleh kosong' };                
                
                else{
                var response = await esql.sqlQuery(Query,
                    [
                        user_id
                    ]);
                _result = response;
                }
               
            }
            
        res.json(_result);        
    }

    async disbursementTrx(req,res) {
        let esql = new Esql();
        let Query = query.SP_DisbursementTrx;
        let _result = { status:'ERROR',message: 'token failed' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token

            const { trx_no, userid, amount } = req.body;
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
                if(trx_no.length == 0 || trx_no == undefined)
                    _result = { status:'ERROR',message: 'Trx No tidak boleh kosong' };
                else if(userid.length == 0 || userid == undefined)
                    _result = { status:'ERROR',message: 'account No tidak boleh kosong' };
                else if(amount.length == 0 || amount == undefined)
                    _result = { status:'ERROR',message: 'Amount tidak boleh kosong' };
                else{
                var response = await esql.sqlProcedure(Query,
                    [
                        trx_no,userid,amount
                    ]);
                _result = response;
                }
               
            }
            
        res.json(_result);        
    }

}

module.exports = WalletModel;