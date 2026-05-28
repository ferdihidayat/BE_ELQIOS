const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const config = require('../config.js')
const query = require('../query/query.js')
const _ = require('lodash')


class DistrictModel {
    constructor(token) {
        this.token = token;
    }

    async getAllDistrict(req,res) {
        let esql = new Esql();
        let Query = query.district;
        let _result = { status:'ERROR',message: 'param mandatory' };
    
            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
                var response = await esql.sqlQuery(Query,[]);
                _result = { status:'OK',message: 'success', data : response } 
               
            }

        res.json(_result);        
    }


    async getDistrict(req,res) {
        let esql = new Esql();
        let _district = query.districtByName;
        let _result = { status:'ERROR',message: 'param mandatory' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                
                if(req.body.district.length || req.body.subdistrict.length){
                    
                var response = await esql.sqlQuery(_district,[`%${req.body.district}%${req.body.subdistrict}%`]);
                // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
                _result = { status:'OK',message: response }  
                }
               
            }

        res.json(_result);        
    }


}

module.exports = DistrictModel;