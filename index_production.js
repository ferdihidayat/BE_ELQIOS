const express = require('express');
const app = express();
const cors = require('cors'); 
const Mqtt = require('./services/helpers/mqtt.js');
const Config = require('./services/config.js');
const Auth = require('./services/common/auth.js');
const port = 8080;
require('dotenv').config();
const cron = require('node-cron');
const CronJob = require('./services/model/cron_job.js');


const _mqqt = new Mqtt(process.env.MQTT_TLS_HOST);

_mqqt.connect( onConnect =>{
        if(!onConnect)
        console.log('& MQTT Connected Failed')
    }, onMessageRecive=>{
      
        if(onMessageRecive){
          console.log('onMessageRecive',JSON.stringify(onMessageRecive));
          // if(onMessageRecive.status)
          // _mqqt.publish(onMessageRecive.outlet_code,JSON.stringify({outlet_code: onMessageRecive.outlet_code}))

        }
        
    }
);

cron.schedule('0 1 * * *', async () => {
  console.log('⏰ Scheduler berjalan:', new Date().toISOString());

  try {
    const job = new CronJob();
    await job.setOffDeviceMSG();
    console.log('✅ Stored procedure berhasil dijalankan');
  } catch (err) {
    console.error('❌ Scheduler error:', err);
  }
}, {
  timezone: 'Asia/Jakarta'
});

app.use(cors()); 
app.use(express.json());

app.post('/encrypt', async (req, res, next) => {
    new Auth().encrypt(req, res);
   
});

app.post('/decrypt', async (req, res, next) => {
    new Auth().decrypt(req, res);

});

app.post('/genbase64', async (req, res, next) => {
    new Auth().genBase64(req, res);

});

app.post('/midtrans/notification', async (req, res) => {
  
  // Jawaban wajib: HTTP 200
  res.status(200).json({ orderId: req.body.order_id,status: req.body.transaction_status ,message: 'Notification received' });
});


app.post('/charge', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  
  const qris_installment = require('./services/common/payment.js');
  new qris_installment(token).charge(req, res);
});

app.post('/charge20260204', (req, res) => {
  const token = ''; // ambil token setelah "Bearer"  
  const qris_installment = require('./services/common/payment.js');
  new qris_installment(token).charge20260204(req, res);
});

app.post('/webhook_2026030601', (req, res) => {
  
  const qris_installment = require('./services/common/payment.js');
  new qris_installment().midtransHook(req, res);
});

app.post('/pending_charge', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  
  const qris_installment = require('./services/common/payment.js');
  new qris_installment(token).pending_charge(req, res);
});

app.post('/wallet', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  
  const wallet = require('./services/model/wallet.js');
  new wallet(token).getWallet(req, res);
});


app.post('/withdrawalTrx', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  
  const wallet = require('./services/model/wallet.js');
  new wallet(token).getWithdrawal(req, res);
});

app.post('/requestWithdrawal', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  
  const wallet = require('./services/model/wallet.js');
  new wallet(token).requestWithdrawal(req, res);
});

app.post('/disbursementList', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  
  const wallet = require('./services/model/wallet.js');
  new wallet(token).disbursementList(req, res);
});

app.post('/disbursement', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  
  const wallet = require('./services/model/wallet.js');
  new wallet(token).disbursementTrx(req, res);
});


app.post('/getpaymentstatus', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  console.log('token',token)
  const qris_installment = require('./services/common/payment.js');
  new qris_installment(token).getPaymentStatus(req, res);
});


app.post('/getpaymentstatus20260204', (req, res) => {

  const token = '';
  
  const qris_installment = require('./services/common/payment.js');
  new qris_installment(token).getpaymentstatus20260204(req, res);
});


// Endpoint GET
app.get('/', (req, res) => {
  res.send('404');
});

// Endpoint GET
app.get('/uuid', (req, res) => {
  new Auth().generateUUID(req, res);
});

// Endpoint POST
app.post('/getToken', (req, res) => {
  new Auth().getToken(req, res);
});

app.post('/checkToken', (req, res) => {
  new Auth().checkToken(req, res);
});

app.post('/checkLogin', (req, res) => {
  new Auth().checkIsLogin(req, res);
});


app.post('/getOwnerlist', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const OwnerModel = require('./services/model/owner.js');
  const model = new OwnerModel(token);
  model.getOwnerList(res);
});


app.post('/getOwnerByCode20260206001', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const OwnerModel = require('./services/model/owner.js');
  const model = new OwnerModel(token);
  model.getOwnerOutletCode20260206001(req,res);
});


app.post('/districtlist', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DistrictModel = require('./services/model/district.js');
  const model = new DistrictModel(token);
  model.getAllDistrict(req, res);
});

app.post('/district', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DistrictModel = require('./services/model/district.js');
  const model = new DistrictModel(token);
  model.getDistrict(req, res);
});

app.post('/getoutlet', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const OutletModel = require('./services/model/outlet.js');
  const model = new OutletModel(token);
  model.getOutletByOwnerId(req, res);
});

app.post('/getOutletOwnerList_2026013001', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const OutletModel = require('./services/model/outlet.js');
  const model = new OutletModel(token);
  model.getOutletOwnerList_2026013001(res);
});


app.post('/messageBroker0211253', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const OwnerModel = require('./services/model/owner.js');
  const model = new OwnerModel(token);
  model.messageBroker0211253(req, res);
});

app.post('/getoutletlist', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const OutletModel = require('./services/model/outlet.js');
  const model = new OutletModel(token);
  model.getOutletList(res);
});

app.post('/getoutletlist20260201', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const OutletModel = require('./services/model/outlet.js');
  const model = new OutletModel(token);
  model.getoutletlist20260201(res);
});


app.post('/setoutlet', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const OutletModel = require('./services/model/outlet.js');
  const model = new OutletModel(token);
  model.setOutlet(req, res);
});

app.post('/create_ticket', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const TicketModel = require('./services/model/ticketing.js');
  const model = new TicketModel(token);
  model.create(req, res);
});

app.post('/getdevices', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.getDeviceByOwnerId(req, res);
});

app.post('/setDeviceOnOff20260208001', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.setDeviceOnOff20260208001(req, res);
});

app.post('/getDevicesByOutletCode20260201001', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.getDevicesByOutletCode20260201(req, res);
});


app.post('/cekvending_mechine0711251', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.getVendingDeviceByNo(req, res);
});

app.post('/getdevices_pricelist061120251', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.getDevicePriceList(req, res);
});


app.post('/setdevices_pricelist231120251', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.setDevicePriceList(req, res);
});

app.post('/getlistgroupdevices', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.getDeviceStatusByOwnerId(req, res);
});


app.post('/getdevices_active', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.getDeviceAvailableByOutletId(req, res);
});

app.get('/checkControllerVersioning2026022101', (req, res) => {
  
  const VersioningModel = require('./services/model/versioning.js');
  const model = new VersioningModel('');
  model.checkControllerVersioning2026022101(req, res);
});

app.get('/cekdevices_status', (req, res) => {
  // Lanjutkan validasi atau pemrosesan token
  // console.log('device_code',JSON.stringify(req));
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel('');
  model.getStatusDeviceByCode(req, res);
});

app.get('/getorder_status', (req, res) => {
    const authHeader = req.headers['regkey'];
  if(authHeader != Config.encKey){
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const DevicesModel = require('./services/model/charge.js');
  const model = new DevicesModel('');
  model.getOrderStatus_Esp32_2025(req, res);
});

app.post('/sendmqttstatus2003010', (req, res) => {
  const regkey = req.headers['regkey'];
  const clientId = req.headers['clientid'];
  
  if ((!regkey || regkey != Config.encKey) && (!clientId || clientId != Config.clientId)) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  // const { config } = require('dotenv');
  const model = new DevicesModel('');
  model.setDeviceMqttStatus2002010(req, res);
});

app.post('/getDailyReport2025121701', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const ReportModel = require('./services/model/report.js');
  const model = new ReportModel(token);
  model.getDailyReport(req, res);
});


app.post('/cekVersion31102025', (req, res) => {
  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  // const { config } = require('dotenv');
  const model = new DevicesModel('');
  model.cekVersion31102025(req, res);
});



app.post('/updateDeviceConnection1011251', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.updateDeviceConnection1011251(req, res);
});


app.post('/setdevices', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.setDevice(req, res);
});

app.post('/setOffEsp32DeviceBox_2025', (req, res) => {
  const regkey = req.headers['regkey'];
  const clientId = req.headers['clientid'];

  if ((!regkey || regkey != Config.encKey) && (!clientId || clientId != Config.clientId)) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  // const { config } = require('dotenv');
  const model = new DevicesModel('');
  model.setOffEsp32DeviceBox_2025(req, res);
});

app.post('/setDeviceController20260204001', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  // const { config } = require('dotenv');
  const model = new DevicesModel(token);
  model.setDeviceController20260204001(req, res);
});


app.post('/setKioskCon20260204002', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  // const { config } = require('dotenv');
  const model = new DevicesModel(token);
  model.setKioskCon20260204002(req, res);
});


app.post('/setdevices_status', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.setDeviceStatus(req, res);
});


app.post('/updateDevicePriceById', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const DevicesModel = require('./services/model/devices.js');
  const model = new DevicesModel(token);
  model.setDevicePriceById(req, res);
});

app.post('/setPayloadId', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const UserModel = require('./services/model/users.js');
  const model = new UserModel(token);
  model.setPlayerId(req,res);
});

app.get('/getPlayerIdWd103347404', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const UserModel = require('./services/model/users.js');
  const model = new UserModel(token);
  model.getPlayerIdWd103347(res);
});

app.post('/setPin02435', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const UserModel = require('./services/model/users.js');
  const model = new UserModel(token);
  model.setUserPin02435(req,res);
});

app.post('/changePassword0211254', (req, res) => {
  const authHeader = req.headers['authorization']; // atau req.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // ambil token setelah "Bearer"  

  // Lanjutkan validasi atau pemrosesan token
  const UserModel = require('./services/model/users.js');
  const model = new UserModel(token);
  model.changePassword0211254(req, res);
});


app.post('/signUp', (req, res) => {  
  const SignModel = require('./services/model/sign.js');
  const model = new SignModel();
  model.signUp(req, res);
});


app.post('/signin', (req, res) => {  
  const SignModel = require('./services/model/sign.js');
  const model = new SignModel();
  model.signIn(req, res);
});

app.post('/signinWeb', (req, res) => {
  const SignModel = require('./services/model/sign.js');
  const model = new SignModel();
  model.signInWeb(req, res);
});

// ── Dashboard ──────────────────────────────────────────────
app.get('/getDashboard', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const DashboardModel = require('./services/model/dashboard.js');
  new DashboardModel(token).getDashboard(req, res);
});

app.post('/updateDashboardDevice', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const DashboardModel = require('./services/model/dashboard.js');
  new DashboardModel(token).updateDeviceStatus(req, res);
});

app.get('/getDashboardOwner', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const DashboardModel = require('./services/model/dashboard.js');
  new DashboardModel(token).getDashboardOwner(req, res);
});

app.post('/getOwnerTransactions', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const DashboardModel = require('./services/model/dashboard.js');
  new DashboardModel(token).getOwnerTransactions(req, res);
});

// ── Profile ──────────────────────────────────────────────
app.get('/getProfile', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const ProfileModel = require('./services/model/profile.js');
  new ProfileModel(token).getProfile(req, res);
});

app.post('/updateProfile', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const ProfileModel = require('./services/model/profile.js');
  new ProfileModel(token).updateProfile(req, res);
});

app.post('/changePassword', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const ProfileModel = require('./services/model/profile.js');
  new ProfileModel(token).changePassword(req, res);
});

app.get('/getBankAccount', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const ProfileModel = require('./services/model/profile.js');
  new ProfileModel(token).getBankAccount(req, res);
});

app.post('/updateBankAccount', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const ProfileModel = require('./services/model/profile.js');
  new ProfileModel(token).updateBankAccount(req, res);
});

app.post('/signOut', (req, res) => {  
  const SignModel = require('./services/model/sign.js');
  const model = new SignModel();
  model.signOut(req, res);
});


// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});