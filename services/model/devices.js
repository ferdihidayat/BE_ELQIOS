const Esql = require('../helpers/entity.js')
const BearerToken = require('../helpers/auth.js')
const config = require('../config.js')
const query = require('../query/query.js')
const Mqtt = require('../../services/helpers/mqtt.js')
const _ = require('lodash')
require('dotenv').config();

class DevicesModel {
    constructor(token) {
        this.token = token;
    }

    async setDevice(req,res) {
        let esql = new Esql();
        let Query = query.sp_createDevice;
        let _result = { status:'ERROR',message: 'param mandatory' };

            let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
            let token = bearer.responseToken(this.token);        
            _result = token
            
            if (token.status == 'OK'){
                _result = { status:'ERROR',message: 'param mandatory' };
                // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
                if(req.body.alias_name.length == 0 || req.body.alias_name == undefined)
                    _result = { status:'ERROR',message: 'Nama Mesin tidak boleh kosong' };
                else if(req.body.outlet_id == 0 || req.body.outlet_id == undefined)
                    _result = { status:'ERROR',message: 'Outlet tidak boleh kosong' };
                else if(req.body.device_type_id == 0 || req.body.device_type_id == undefined)
                    _result = { status:'ERROR',message: 'Tipe Mesin tidak boleh kosong' };
                else{
                var response = await esql.sqlProcedure(Query,
                    [
                        req.body.alias_name,req.body.outlet_id,req.body.device_type_id,
                        req.body.merk,req.body.brand_type,req.body.capacity,
                        req.body.good_capacity,req.body.insert_by
                    ]);
                _result = { status:'OK',message: response }  
                }
               
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

    async getDeviceByOwnerId(req,res) {
        let esql = new Esql();
        let __devices = query.devicesBywnerId;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        _result = token
        console.log('_token',JSON.stringify(_result))
        if (token.status == 'OK'){
            
            _result = { status:'ERROR',message: 'param mandatory' };
            
            if(req.body.user_id !='' || req.body?.user_id != undefined){

            var response = await esql.sqlQuery(__devices,[req.body.user_id]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: response }  
            }
        
        }

        res.json(_result);        
    }
    
    async setDeviceOnOff20260208001(req,res) {
        let esql = new Esql();
        let __devices = query.setOnOffDevice;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        _result = token
        const { device_code, status_id } = req.body;
        // console.log('_token',JSON.stringify(_result))
        if (token.status == 'OK'){
            
            _result = { status:'ERROR',message: 'param mandatory' };
            
            if(device_code.length == 0 || device_code == undefined)
                _result = { status:'ERROR',message: 'device_code param mandatory' };
            
            else if(status_id.length == 0 || status_id == undefined)
                _result = { status:'ERROR',message: 'status param mandatory' };
            else{

            var response = await esql.sqlQuery(__devices,[status_id,device_code]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: response }  
            }
        
        }

        res.json(_result);
    }
    
    async getDevicesByOutletCode20260201(req,res) {
        let esql = new Esql();
        let __devices = query.devicesByOutletCode;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        _result = token
        
        if (token.status == 'OK'){
            
            _result = { status:'ERROR',message: 'param mandatory' };
            
            if(req.body.outlet_code !='' || req.body?.outlet_code != undefined){

            var response = await esql.sqlQuery(__devices,[req.body.outlet_code]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: response }  
            }
        
        }

        res.json(_result);
    }
    
    async getDeviceStatusByOwnerId(req,res) {
        let esql = new Esql();
        let __devices = query.devicesStatusByOwnerId;
        let _result = { status:'ERROR',message: 'param mandatory'};

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        _result = token
        console.log('_token',JSON.stringify(_result))
        if (token.status == 'OK'){
            
            _result = { status:'ERROR',message: 'param mandatory' };
            
            if(req.body.user_id !='' || req.body?.user_id != undefined){

            var response = await esql.sqlQuery(__devices,[req.body.user_id]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: response }  
            }
        
        }

        res.json(_result);        
    }
    
   async getDeviceAvailableByOutletId(req,res) {
        let esql = new Esql();
        let __devices = query.devicesAvailableByOutletId;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        _result = token
        console.log('_token',JSON.stringify(_result))

        const {outlet_id, user_id} = req.body;
        if (token.status == 'OK'){
            
            _result = { status:'ERROR',message: 'param mandatory' };

            if(outlet_id.length == 0 || outlet_id == undefined)
                    _result = { status:'ERROR',message: 'Parameter tidak boleh kosong' };    
            else if(user_id.length == 0 || user_id == undefined)
                    _result = { status:'ERROR',message: 'Parameter tidak boleh kosong' }; 
            else{
                const response = await esql.sqlQuery(__devices,[outlet_id,user_id]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
                _result = { status:'OK',message: 'success', data: response }  
            }   
            
          
        
        }

        res.json(_result);        
    }
    
    async getStatusDeviceByCode(req,res) {
        let esql = new Esql();
        let __devices = query.devicesByCode;
        let __setMinPowerStandBy = query.SP_SetMinPowerStandBy;
        let _result = { status:'ERROR',message: 'param mandatory' };
       
        if(req.query?.device_code !='' || req.query?.device_code != undefined){

            var response = await esql.sqlQuery(__devices,[req.query.device_code]);
            var setRes = await esql.sqlProcedure(__setMinPowerStandBy,[req.query.device_code,req.query.min_power_standby]);
             
            // 🔥 HILANGKAN Cert & InoCode
            const cleanData = response.map(({ Cert, InoCode, ...rest }) => rest);

            _result = { status:'OK',message: 'success', data: cleanData }  
        }

        res.json(_result);        
    }
    
    async setDeviceController20260204001(req,res) {
        let esql = new Esql();
        let Query = query.SP_UpdateController;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        let __data = req.body?.data;
        _result = token
        
        if (token.status == 'OK'){
            _result = { status:'ERROR',message: 'param mandatory' };
            // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
            
            if(req.body?.isUpdate.length == 0 || req.body?.isUpdate == undefined)
                _result = { status:'ERROR',message: 'id isUpdate tidak boleh kosong' };
            else if(__data.device_code.length == 0 || __data.device_code == undefined)
                _result = { status:'ERROR',message: 'id device_code tidak boleh kosong' };
            else if(__data.power_standby.length == 0 || __data.power_standby == undefined)
                _result = { status:'ERROR',message: 'id power_standby tidak boleh kosong' };
            else if(__data.wifi_pin.length == 0 || __data.wifi_pin == undefined)
                _result = { status:'ERROR',message: 'wifi_pin tidak boleh kosong' };
            else if(__data.relay_pin.length == 0 || __data.relay_pin == undefined)
                _result = { status:'ERROR',message: 'relay_pin tidak boleh kosong' };
            else if(__data.button_pin.length == 0 || __data.button_pin == undefined)
                _result = { status:'ERROR',message: 'button_pin tidak boleh kosong' };
            else if(__data.minute_duration.length == 0 || __data.minute_duration == undefined)
                _result = { status:'ERROR',message: 'minute_duration tidak boleh kosong' };
            else if(__data.pzem_rx.length == 0 || __data.pzem_rx == undefined)
                _result = { status:'ERROR',message: 'pzem_rx tidak boleh kosong' };
            else if(__data.pzem_tx.length == 0 || __data.pzem_tx == undefined)
                _result = { status:'ERROR',message: 'pzem_tx tidak boleh kosong' };
            else if(__data.off_delay.length == 0 || __data.off_delay == undefined)
                _result = { status:'ERROR',message: 'off_delay tidak boleh kosong' };
            else{
            var response = await esql.sqlProcedure(Query,
                [
                    __data.device_code,__data.power_standby,__data.wifi_pin,
                    __data.relay_pin,__data.button_pin,__data.minute_duration,
                    __data.pzem_rx,__data.pzem_tx,__data.off_delay
                ]);
            _result = { status:'OK',message: response }  
            }
           
        }
            
        res.json(_result);        
    }
    
    
    
     async setKioskCon20260204002(req,res) {
        let esql = new Esql();
        let Query = query.SP_UpdateKiosk;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token); 
        let __data = req.body;
        _result = token

        console.log('res',JSON.stringify(_result))
        
        if (token.status == 'OK'){
            _result = { status:'ERROR',message: 'param mandatory' };
            // console.log('district',JSON.stringify(req.body.district),'_',req.body.subdistrict.length);
            
            if(__data?.device_code.length == 0 || __data?.device_code == undefined)
                _result = { status:'ERROR',message: 'id device_code tidak boleh kosong' };
            else if(__data.is_kiosk.length == 0 || __data.is_kiosk == undefined)
                _result = { status:'ERROR',message: 'id device_code tidak boleh kosong' };
            else if(__data.is_connected.length == 0 || __data.is_connected == undefined)
                _result = { status:'ERROR',message: 'id device_code tidak boleh kosong' };           
            else{
            var response = await esql.sqlProcedure(Query,
                [
                    __data.device_code,__data.is_kiosk,__data.is_connected
                ]);
            _result = { status:'OK',message: response }  
            }
           
        }
            
        res.json(_result);        
    }
    
    async setOffEsp32DeviceBox_2025(req,res) {
        let esql = new Esql();
        let __devices = query.SP_UpdateDeviceStatus;
        let _result = { status:'ERROR',message: 'param mandatory' };
       
        if(req.body?.outlet_code !='' || req.body?.device_code != '' || req.body?.status_id != undefined){

            var response = await esql.sqlQuery(__devices,[req.body.outlet_code,req.body.device_code,req.body.status_id]);
             console.log('device_code',JSON.stringify(response));
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: response };
        }

        res.json(_result);        
    }
    
    
    async setDeviceStatus(req,res) {
        let esql = new Esql();
        let __devices = query.SP_UpdateDeviceStatus;
        let _result = { status:'ERROR',message: 'param mandatory' };

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        _result = token
        console.log('_token',JSON.stringify(_result))
        if (token.status == 'OK'){
            
            _result = { status:'ERROR',message: 'param mandatory' };
            
            if(req.body?.outlet_code !='' || req.body?.device_code != '' || req.body?.status_id != undefined){

            var response = await esql.sqlQuery(__devices,[req.body.outlet_code,req.body.device_code,req.body.status_id]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: req.body }  
            }
        
        }

        res.json(_result);        
    }
    
    
    async setDeviceMqttStatus2002010(req,res) {
        let esql = new Esql();
        let __devices = query.SP_SetMqttStatus;
        let _result = { status:'ERROR',message: 'param mandatory' };
        
        const { device_code,status } = req.body;    
        console.log(device_code,'status',status);    
        if(device_code.length == 0 || device_code == undefined)
         _result = { status:'ERROR',message: 'Number tidak boleh kosong' };
        if(status.length == 0 || status == undefined)
         _result = { status:'ERROR',message: 'secret id tidak boleh kosong' };            
        const response = await esql.sqlProcedure(__devices,[device_code,status]);
    
        _result = response[0];
        // if(_result?.status === 'OK'){
        //     const _mqqt = new Mqtt(process.env.MQTT_TLS_HOST);
        //     const __message = {status:'isConnected'};
        //     // jeda 3 detik sebelum publish
        //     setTimeout(() => {
        //         _mqqt.publish(_result?.outlet_code, JSON.stringify(__message));
        //         console.log('✅ MQTT published after 3 seconds delay');
        //     }, 3000);
        // }
        

        res.json(_result);        
    }
    
    async cekVersion31102025(req,res) {
        let esql = new Esql();
        let __devices = query.SP_CheckVersion;
        let _result = { status:'ERROR',message: 'param mandatory' };
        
        const { version_apk } = req.body;    
        
        if(version_apk.length == 0 || version_apk == undefined)
         _result = { status:'ERROR',message: 'Number tidak boleh kosong' };         
        const response = await esql.sqlProcedure(__devices,[version_apk]);
    
        _result = response[0];

        

        res.json(_result);        
    }
    
    async getDevicePriceList(req,res) {
        let esql = new Esql();
        let __devices = query.devicePriceList;
        let _result = { status:'ERROR',message: 'param mandatory' };
        const { id,code } = req.body;

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        _result = token
        // console.log('_token',JSON.stringify(_result))
        if (token.status == 'OK'){
            
            _result = { status:'ERROR',message: 'param mandatory' };
            if(id !='' || id != undefined)
                _result = { status:'ERROR',message: 'param mobile_no mandatory' };
            if(code =='' || code == undefined)
                _result = { status:'ERROR',message: 'param code mandatory' };
            else{

            var response = await esql.sqlQuery(__devices,[id,code]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: response }  
            }
        
        }

        res.json(_result);        
    }
    
    async setDevicePriceList(req,res) {
        let esql = new Esql();
        let __devices = query.SP_SetDevicePriceList;
        let _result = { status:'ERROR',message: 'param mandatory' };
        const { id,duration,price } = req.body;

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);
        _result = token
        // console.log('_token',JSON.stringify(_result))
        if (token.status == 'OK'){
            
            _result = { status:'ERROR',message: 'param mandatory' };
            if(id !='' || id != undefined)
                _result = { status:'ERROR',message: 'param deviceId mandatory' };
            if(duration !='' || duration != undefined)
                _result = { status:'ERROR',message: 'param duration mandatory' };
            if(price =='' || price == undefined)
                _result = { status:'ERROR',message: 'param price mandatory' };
            else{

            var response = await esql.sqlProcedure(__devices,[id,duration,price]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            _result = { status:'OK',message: 'success', data: response }  
            }
        
        }

        res.json(_result);        
    }
    
    async getVendingDeviceByNo(req,res) {
        let esql = new Esql();
        let __devices = query.SP_GetDeviceByStack;
        let _result = { status:'ERROR',message: 'param mandatory',data:[] };
        const { mobile_no,id,code } = req.body;

        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);        
        _result = token
        // console.log('_token',JSON.stringify(_result))
        if (token.status == 'OK'){
            
            //_result = { status:'ERROR',message: 'param mandatory' };
            
            if(mobile_no =='' || mobile_no == undefined)
                _result = { status:'ERROR',message: 'param mobile_no mandatory' };
            if(id =='' || id == undefined)
                _result = { status:'ERROR',message: 'param id mandatory' };
            if(code =='' || code == undefined)
                _result = { status:'ERROR',message: 'param code mandatory' };
            else{

            var response = await esql.sqlProcedure(__devices,[mobile_no,id,code]);
            // console.log('district',req.body.district,'_',req.body.subdistrict, JSON.stringify(response));
            
             _result = { status:'ERROR',message: '404', data: response }
            if(response.length && response[0]?.status == 'OK')
            _result = { status:'OK',message: 'success', data: response }  
            }
        
        }

        res.json(_result);        
    }
    
    async updateDeviceConnection1011251(req,res) {
        let esql = new Esql();
        let __devices = query.SP_UpdateDeviceStatusByNo;
        let _result = { status:'ERROR',message: 'param mandatory' };
        let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
        let token = bearer.responseToken(this.token);
        _result = token

        const { code,status,is_connected } = req.body;    
        
        if (token.status == 'OK'){
            if(code.length == 0 || code == undefined)
            _result = { status:'ERROR',message: 'kode device tidak boleh kosong' };
            if(status.length == 0 || status == undefined)
            _result = { status:'ERROR',message: 'status tidak boleh kosong' };
            if(is_connected.length == 0 || is_connected == undefined)
            _result = { status:'ERROR',message: 'koneksi tidak boleh kosong' };
            const response = await esql.sqlProcedure(__devices,[code,status,is_connected]);
        
        _result = response[0];
        }
        

        

        res.json(_result);        
    }


}

module.exports = DevicesModel;