const mysql = require('mysql');
const config = require('../config');

const pool = mysql.createPool(config.DBauth)

class Core_sql {
    constructor() { }

    sqlQuery(Query) {


        return new Promise((resolve, reject) => {

            pool.query(Query, (err, res) => {
                let response = {}

                if (err) {
                    response = {
                        status: 400,
                        msgError: err
                    }

                    // console.log('error connection', JSON.stringify(response))
                    return reject(response)
                }


                return resolve(res)
            })
        })
    }

    sqlQuery(Query,WhereBy) {


        return new Promise((resolve, reject) => {

            pool.query(Query, WhereBy, (err, res) => {
                let response = {}

                if (err) {
                    response = {
                        status: 400,
                        msgError: err
                    }

                    // console.log('error connection', JSON.stringify(response))
                    return reject(response)
                }


                return resolve(res)
            })
        })
    }


    sqlProcedure(Query, Param) {


        return new Promise((resolve, reject) => {

            pool.query(Query, Param, (err, res) => {
                let response = {}
                // console.log(JSON.stringify(res))
                // console.log('error connection', JSON.stringify(Query), JSON.stringify(Param))
                if (err) {
                    response = {
                        status: 400,
                        msgError: err
                    }

                    // console.log('error connection', JSON.stringify(response))
                    return reject(response)
                }


                return resolve(res[0])
            })
        })
    }

    getConnection() {
        return new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    return reject({
                        status: 400,
                        msgError: err
                    })
                }

                const conn = {
                    beginTransaction() {
                        return new Promise((res, rej) => {
                            connection.beginTransaction((err) => {
                                if (err) return rej({ status: 400, msgError: err })
                                return res()
                            })
                        })
                    },
                    commit() {
                        return new Promise((res, rej) => {
                            connection.commit((err) => {
                                if (err) return rej({ status: 400, msgError: err })
                                return res()
                            })
                        })
                    },
                    rollback() {
                        return new Promise((res, rej) => {
                            connection.rollback((err) => {
                                if (err) return rej({ status: 400, msgError: err })
                                return res()
                            })
                        })
                    },
                    query(query, params) {
                        return new Promise((res, rej) => {
                            if (params !== undefined) {
                                connection.query(query, params, (err, results) => {
                                    if (err) return rej({ status: 400, msgError: err })
                                    return res(results)
                                })
                            } else {
                                connection.query(query, (err, results) => {
                                    if (err) return rej({ status: 400, msgError: err })
                                    return res(results)
                                })
                            }
                        })
                    },
                    release() {
                        connection.release()
                    }
                }

                return resolve(conn)
            })
        })
    }

}

module.exports = Core_sql;