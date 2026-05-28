const Esql = require('../helpers/entity.js')
const query = require('../query/query.js')
const _ = require('lodash')

class CronJob {
    constructor() {
    }

async setOffDeviceMSG() {
        let esql = new Esql();
        let Query = query.SP_SetOffDeviceMsg;
        var response = await esql.sqlProcedure(Query,[]);
            
    }

}

module.exports = CronJob;