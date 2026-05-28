const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const config = require('../config.js')
const query = require('../query/query.js')
const _ = require('lodash')
require('dotenv').config();

class VersioningModel {
    constructor() {        
    }

    async checkControllerVersioning2026022101(req,res) {
        let esql = new Esql();
        let __versioning = query.checkVersioning;
        let _result = { status:'ERROR',message: 'param mandatory' };
        const { code } = req.query;

        _result = { status:'ERROR',message: 'param mandatory' };
            
            if(code =='' || code == undefined)
                _result = { status:'ERROR',message: 'param code mandatory' };
            else{

            var response = await esql.sqlQuery(__versioning,[code]);
            // console.log('__versioning',code, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: response }  
            }

        res.json(_result);        
    }
}

module.exports = VersioningModel;