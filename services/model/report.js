const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const config = require('../config.js')
const query = require('../query/query.js')
const _ = require('lodash')

class ReportModel {
    constructor(token) {
        this.token = token;
    }

    async getDailyReport(req, res) {
    let esql = new Esql();
    let __dailyReport = query.dailyReport;

    // ===== TOKEN CHECK =====
    let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
    let token = bearer.responseToken(this.token);

    if (token.status !== 'OK') {
        return res.json(token);
    }

    // ===== VALIDASI BODY HARUS ARRAY =====
    if (!Array.isArray(req.body) || req.body.length === 0) {
        return res.json({
            status: 'ERROR',
            message: 'Body must be a non-empty array'
        });
    }

    let allData = [];   // <<< MENAMBAHKAN INI

    // ===== PROSES SETIAP ITEM DALAM ARRAY =====
    for (const item of req.body) {

        const { outlet_code, start_date, end_date } = item;

        // Validasi parameter per item
        if (!outlet_code || !start_date || !end_date) {
            continue;  // skip
        }

        try {
            const response = await esql.sqlQuery(__dailyReport, [
                outlet_code,
                start_date,
                end_date
            ]);

            // Gabungkan semua hasil ke dalam satu array
            allData.push(...response);  // <<< KUNCI UTAMA

        } catch (err) {
            console.log("Query Error ->", err);
        }
    }

    // ===== FINAL RESPONSE =====
    res.json({
        status: 'OK',
        message: 'Data merged successfully',
        total: allData.length,
        data: allData            // <<< semua data gabungan
    });
}

}

module.exports = ReportModel;