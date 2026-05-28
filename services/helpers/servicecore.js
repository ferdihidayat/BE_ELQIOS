const axios = require('axios');

class ServiceCore {
    constructor(url) {
        this.url = url;
    }

    _url = '';
    _onSuccess = null;
    _serviceResult = {};

    async Post(headers, body) {

        var option = {
            method: 'POST',
            url: this.url,
            headers: headers != null ? headers : {},
            data: JSON.stringify(body != null ? body : {}),
            timeout: 5000
        }
        
        this._serviceResult = await GetReponse(option);

        return this._serviceResult;
    }

    async Get(headers) {

        var option = {
            method: 'GET',
            url:this.url,
            headers: headers != null ? headers : {},
            timeout: 1000
            //body: JSON.stringify(body != null ? body : {})
        }

        this._serviceResult = await GetReponse(option);
        return this._serviceResult;
    }

    async Put(headers, body) {

        var option = {
            method: 'PUT',
            url:this.url,
            headers: headers != null ? headers : {},
            data: JSON.stringify(body != null ? body : {}),
            timeout: 1000
        }

        this._serviceResult = await GetReponse(option);
        return this._serviceResult;
    }
}

async function GetReponse(option) {
    const response = await axios(option);
    // console.log(JSON.stringify(response.data));
    return response.data;
}


module.exports = ServiceCore;