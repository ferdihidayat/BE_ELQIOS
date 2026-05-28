const mqtt = require('mqtt');
const Esql = require('./entity.js');
const query = require('../query/query.js')


class MQTT{
    constructor(options){   
        this.options = options;
        this.client = mqtt;
        this.client = mqtt.connect(options);
        
    }

    
    async connect(onConnect,onMessageRecive){        
        let _outlet = []; 
        this.client.on('connect', async function () {
            var esql = new Esql();
            _outlet = await esql.sqlQuery(query.outlet);
            
            _outlet.map((a,i) => {
                // console.log('outlet: ',i, JSON.stringify(a.OutletCode))
                this.subscribe(a.OutletCode);
            });

            onConnect(this);                        
        });
        
        this.client.on('message', async function (topic, message) {
            const jsonString = message.toString();
            const _payload = JSON.parse(jsonString);
            onMessageRecive(_payload);           
        });
       
             
    }

    publish(a,b){
        this.client.publish(a,b)
    }

}

module.exports = MQTT;
