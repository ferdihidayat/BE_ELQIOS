const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const config = require('../config.js')
const query = require('../query/query.js')
const _ = require('lodash')


class OutletModel {
    constructor(token) {
        this.token = token;
    }

    async setOutlet(req,res) {
        let esql = new Esql();
        let Query = query.sp_createOutlet;
        let _result = { status:'ERROR',message: 'param mandatory' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
                if(req.body.outlet_name.length == 0 || req.body.outlet_name == undefined)
                    _result = { status:'ERROR',message: 'Nama Outlet tidak boleh kosong' };
                else if(req.body.owner_id == 0 || req.body.owner_id == undefined)
                    _result = { status:'ERROR',message: 'Nama Outlet tidak boleh kosong' };
                else if(req.body.district_id == 0 || req.body.district_id == undefined)
                    _result = { status:'ERROR',message: 'Nama Outlet tidak boleh kosong' };
                else{
                var response = await esql.sqlProcedure(Query,
                    [
                        req.body.outlet_name,req.body.owner_id,req.body.address,req.body.district_id,
                        req.body.latitude,req.body.longitude,req.body.saldo,req.body.register_date,
                        req.body.effective_date,req.body.insert_by
                    ]);
                _result = { status:'OK',message: response }  
                }
               
            }
            
        res.json(_result);        
    }


    async getOutletByOwnerId(req,res) {
        let esql = new Esql();
        let __outlet = query.outletByOwnerId;
        let _result = { status:'ERROR',message: 'param mandatory' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                if(req.body.owner_id || req.body.owner_id != undefined){
                   
                var response = await esql.sqlQuery(__outlet,[req.body.owner_id]);
                // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
                _result = { status:'OK',message: 'success', data: response }  
                }
               
            }

        res.json(_result);        
    }
    
    async getOutletList(res) {
        let esql = new Esql();
        let __outlet = query.outlet;
        let _result = { status:'ERROR',message: 'param mandatory' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token
            
            if (token.status == 'OK'){
                                   
                var response = await esql.sqlQuery(__outlet);
                // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
                _result = { status:'OK',message: 'success', data: response }  
                
               
            }

        res.json(_result);        
    }
    
    async getoutletlist20260201(res) {
        let esql = new Esql();
        let __outlet = query.outletList;
        let _result = { status:'ERROR',message: 'param mandatory' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token
            
            if (token.status == 'OK'){
                                   
                var response = await esql.sqlQuery(__outlet);
                // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
                _result = { status:'OK',message: 'success', data: response }  
                
               
            }

        res.json(_result);        
    }
    
    async getOutletOwnerList_2026013001(res) {
        let esql = new Esql();
        let __outlet = query.outletOwnerList;
        let _result = { status:'ERROR',message: 'param mandatory' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token
            
            if (token.status == 'OK'){
                                   
                var response = await esql.sqlQuery(__outlet);
                // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
                _result = { status:'OK',message: 'success', data: response }  
                
               
            }

        res.json(_result);        
    }


}

module.exports = OutletModel;