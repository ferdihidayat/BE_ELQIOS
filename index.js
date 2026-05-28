const express = require('express');
const app = express();
const cors = require('cors'); 
const Mqtt = require('./services/helpers/mqtt.js');
const Config = require('./services/config.js');
const Auth = require('./services/common/auth.js');
const port = 8881;
require('dotenv').config();
const cron = require('node-cron');
const CronJob = require('./services/model/cron_job.js');


// const _mqqt = new Mqtt(process.env.MQTT_TLS_HOST);

// _mqqt.connect( onConnect =>{
//         if(!onConnect)
//         console.log('& MQTT Connected Failed')
//     }, onMessageRecive=>{
      
//         if(onMessageRecive){
//           console.log('onMessageRecive',JSON.stringify(onMessageRecive));
//           // if(onMessageRecive.status)
//           // _mqqt.publish(onMessageRecive.outlet_code,JSON.stringify({outlet_code: onMessageRecive.outlet_code}))

//         }
        
//     }
// );

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

cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Scheduler berjalan:', new Date().toISOString());

  try {
    const job = new CronJob();
    await job.runBillingReminder('H-3');
    await job.runBillingReminder('H-1');
    await job.runBillingReminder('OVERDUE');
    await job.disableOverdueOutlet();
  } catch (err) {
    console.error('❌ Remainder DueDate Scheduler error:', err);
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

// Endpoint GET
app.get('/uuid', (req, res) => {
  new Auth().generateUUID(req, res);
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

app.get('/getDueDate', (req, res) => {
  // Lanjutkan validasi atau pemrosesan token
  // console.log('device_code',JSON.stringify(req));
  const DevicesModel = require('./services/model/charge.js');
  const model = new DevicesModel('');
  model.getDueDate(req, res);
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
  // console.log(JSON.stringify(req.body));
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

app.get('/getDashboardAdmin', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const DashboardAdminModel = require('./services/model/dashboard_admin.js');
  new DashboardAdminModel(token).getDashboardAdmin(req, res);
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

// ── Wallet ────────────────────────────────────────────────
// ── Wallet ────────────────────────────────────────────────
app.post('/notifyAdmin', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const config = require('./services/config.js');
  const BearerToken = require('./services/helpers/auth.js');
  const Esql = require('./services/helpers/entity.js');
  const bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  const tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);

  const { message, sound } = req.body;
  const esql = new Esql();

  // Ambil PayloadId semua user role 1 (Super Admin)
  esql.sqlQuery('SELECT PayloadId FROM users WHERE RoleId = 1 AND IsActive = 1 AND PayloadId IS NOT NULL')
    .then(async (admins) => {
      if (!admins || !admins.length) return res.json({ status: 'OK', message: 'No admin to notify' });

      const playerIds = admins.map(a => a.PayloadId).filter(Boolean);
      if (!playerIds.length) return res.json({ status: 'OK', message: 'No PayloadId found' });

      try {
        const oneSignalMessageBroker = require('./services/helpers/message_broker.js');
        const notifier = new oneSignalMessageBroker(playerIds);
        await notifier.sendPushToPlayer(message || 'Notifikasi baru', sound || 'default');
        console.log('✅ Admin notified:', playerIds);
        res.json({ status: 'OK', message: 'Admin notified' });
      } catch (err) {
        console.error('OneSignal error:', err.message);
        res.json({ status: 'OK', message: 'Notification sent with errors' });
      }
    })
    .catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
});

app.get('/api/withdrawals', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const Esql = require('./services/helpers/entity.js');
  const config = require('./services/config.js');
  const BearerToken = require('./services/helpers/auth.js');
  const bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  const tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  const esql = new Esql();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const status = req.query.status || '';
  const search = req.query.search || '';
  let conditions = '1=1', params = [];
  if (status) { conditions += ' AND wt.Status = ?'; params.push(parseInt(status)); }
  if (search) { conditions += ' AND (wt.WithdrawalCode LIKE ? OR u.DisplayName LIKE ? OR wt.OutletCode LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  Promise.all([
    esql.sqlQuery(`SELECT COUNT(*) AS total FROM withdrawal_trx wt JOIN users u ON wt.OwnerId = u.UserId WHERE ${conditions}`, params),
    esql.sqlQuery(`SELECT wt.*, u.DisplayName AS OwnerName, u.MobilePhone, ws.StatusName FROM withdrawal_trx wt JOIN users u ON wt.OwnerId = u.UserId JOIN withdrawal_status ws ON wt.Status = ws.StatusId WHERE ${conditions} ORDER BY wt.RequestedAt DESC LIMIT ? OFFSET ?`, [...params, limit, offset])
  ]).then(([[count], withdrawals]) => {
    const total = count?.total || 0;
    res.json({ status: 'OK', data: { withdrawals, pagination: { page, limit, total, totalPages: Math.ceil(total/limit), hasNext: page < Math.ceil(total/limit), hasPrev: page > 1 } } });
  }).catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
});

app.get('/api/wallet', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const jwt = require('jsonwebtoken');
  const Esql = require('./services/helpers/entity.js');
  const config = require('./services/config.js');
  const BearerToken = require('./services/helpers/auth.js');
  const bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  const tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  try {
    const decoded = jwt.verify(token, config.jwtAlgorithm.keyBase22);
    const userData = JSON.parse(decoded.gen);
    const esql = new Esql();
    Promise.all([
      esql.sqlQuery('SELECT * FROM VW_WalletAccount WHERE MobilePhone = ?', [userData.mobile_phone]),
      esql.sqlQuery('SELECT * FROM VW_Withdrawal_MP WHERE MobilePhone = ? ORDER BY RequestedAt DESC', [userData.mobile_phone]),
      esql.sqlQuery(`SELECT os.SubscriptionId, os.Amount, sp.PlanName, sp.BillingCycle, sp.Price 
        FROM owner_subscription os 
        JOIN subscription_plan sp ON os.PlanId = sp.PlanId 
        WHERE os.OwnerId = ? AND os.Status = 'active' 
        ORDER BY os.SubscriptionId DESC LIMIT 1`, [userData.user_id]),
      esql.sqlQuery(`SELECT ot.OutletId, ot.OutletCode, ot.OutletName, ot.Saldo,
        ba.BankName, ba.BankNo, ba.AccountName
        FROM outlet ot
        LEFT JOIN bank_account ba ON ot.BankAccountId = ba.BankId AND ba.IsActive = 1
        WHERE ot.OwnerId = ? AND ot.IsActive = 1
        ORDER BY ot.OutletName ASC`, [userData.user_id])
    ]).then(([wallet, withdrawals, subscription, outlets]) => {
      res.json({ status: 'OK', data: { wallet: wallet[0] || {}, withdrawals: withdrawals || [], subscription: subscription[0] || null, outlets: outlets || [] } });
    }).catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
  } catch(err) { res.status(500).json({ status: 'ERROR', message: err.message }); }
});

// ── Device Management ─────────────────────────────────────
app.get('/api/devices', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const DeviceAdminModel = require('./services/model/device_admin.js');
  new DeviceAdminModel(token).getDeviceList(req, res);
});

app.post('/api/device/create', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const DeviceAdminModel = require('./services/model/device_admin.js');
  new DeviceAdminModel(token).createDevice(req, res);
});

app.post('/api/device/approve', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const DeviceAdminModel = require('./services/model/device_admin.js');
  new DeviceAdminModel(token).approveDevice(req, res);
});

app.get('/api/device/products', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const DeviceAdminModel = require('./services/model/device_admin.js');
  new DeviceAdminModel(token).getProductsByDeviceType(req, res);
});

app.get('/api/device/types', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const BearerToken = require('./services/helpers/auth.js');
  const config = require('./services/config.js');
  const Esql = require('./services/helpers/entity.js');
  let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  let tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  let esql = new Esql();
  esql.sqlQuery('SELECT Id, TypeCode, TypeName FROM device_type WHERE IsActive = 1 ORDER BY TypeName ASC', [])
    .then(types => res.json({ status: 'OK', data: types }))
    .catch(err => res.status(500).json({ status: 'ERROR', message: err.message || 'Failed to fetch device types' }));
});

app.get('/api/controller-types', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const BearerToken = require('./services/helpers/auth.js');
  const config = require('./services/config.js');
  const Esql = require('./services/helpers/entity.js');
  let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  let tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  const deviceTypeId = parseInt(req.query.device_type_id) || 0;
  if (!deviceTypeId) return res.json({ status: 'ERROR', message: 'device_type_id wajib diisi' });
  let esql = new Esql();
  esql.sqlQuery('SELECT Id, Name, DeviceTypeId, BaseCode FROM controller_type WHERE DeviceTypeId = ? AND IsActive = 1 ORDER BY Name ASC', [deviceTypeId])
    .then(types => res.json({ status: 'OK', data: types }))
    .catch(err => res.status(500).json({ status: 'ERROR', message: err.message || 'Failed to fetch controller types' }));
});

app.get('/api/subscription-plans', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const BearerToken = require('./services/helpers/auth.js');
  const config = require('./services/config.js');
  const Esql = require('./services/helpers/entity.js');
  let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  let tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  let esql = new Esql();
  esql.sqlQuery('SELECT PlanId, PlanCode, PlanName, BillingCycle, Price, MaxDevices, Description FROM subscription_plan WHERE IsActive = 1 ORDER BY Price ASC', [])
    .then(plans => res.json({ status: 'OK', data: plans }))
    .catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
});

app.post('/api/device/update', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const DeviceAdminModel = require('./services/model/device_admin.js');
  new DeviceAdminModel(token).updateDevice(req, res);
});

// ── User Management ──────────────────────────────────────
app.get('/api/users', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const UserAdminModel = require('./services/model/user_admin.js');
  new UserAdminModel(token).getUserList(req, res);
});

app.get('/api/user/detail', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const UserAdminModel = require('./services/model/user_admin.js');
  new UserAdminModel(token).getUserDetail(req, res);
});

app.post('/api/user/update', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const UserAdminModel = require('./services/model/user_admin.js');
  new UserAdminModel(token).updateUser(req, res);
});

app.post('/api/user/create', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const UserAdminModel = require('./services/model/user_admin.js');
  new UserAdminModel(token).createUser(req, res);
});

app.post('/api/user/reset-password', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const UserAdminModel = require('./services/model/user_admin.js');
  new UserAdminModel(token).resetPassword(req, res);
});

app.post('/api/user/unlock', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const UserAdminModel = require('./services/model/user_admin.js');
  new UserAdminModel(token).unlockUser(req, res);
});

app.post('/api/user/generate-2fa', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const UserAdminModel = require('./services/model/user_admin.js');
  new UserAdminModel(token).generate2FA(req, res);
});

app.post('/api/user/resend-2fa', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const UserAdminModel = require('./services/model/user_admin.js');
  new UserAdminModel(token).resend2FA(req, res);
});

// ── Outlet Admin ──────────────────────────────────────────
app.get('/api/outlets', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const OutletAdminModel = require('./services/model/outlet_admin.js');
  new OutletAdminModel(token).getOutletList(req, res);
});

app.get('/api/outlet/detail', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const OutletAdminModel = require('./services/model/outlet_admin.js');
  new OutletAdminModel(token).getOutletDetail(req, res);
});

app.post('/api/outlet/update', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const OutletAdminModel = require('./services/model/outlet_admin.js');
  new OutletAdminModel(token).updateOutlet(req, res);
});

app.post('/api/outlet/create', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const OutletAdminModel = require('./services/model/outlet_admin.js');
  new OutletAdminModel(token).createOutlet(req, res);
});

app.post('/api/owner/create', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const OutletAdminModel = require('./services/model/outlet_admin.js');
  new OutletAdminModel(token).createOwner(req, res);
});

// ── Owner Payment Status Check ───────────────────────────
app.get('/api/owner/payment-status', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const jwt = require('jsonwebtoken');
  const Esql = require('./services/helpers/entity.js');
  const config = require('./services/config.js');
  const BearerToken = require('./services/helpers/auth.js');
  const bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  const tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  try {
    const decoded = jwt.verify(token, config.jwtAlgorithm.keyBase22);
    const userData = JSON.parse(decoded.gen);
    // Only for owner (role_id=3)
    if (userData.role_id !== 3) return res.json({ status: 'OK', data: { has_active_outlet: true, has_unpaid_subscription: false } });
    const esql = new Esql();
    Promise.all([
      esql.sqlQuery('SELECT COUNT(*) AS cnt FROM outlet WHERE OwnerId = ? AND IsActive = 1', [userData.user_id]),
      esql.sqlQuery("SELECT COUNT(*) AS cnt FROM owner_subscription WHERE OwnerId = ? AND Status = 'active' AND PaymentStatus = 'unpaid'", [userData.user_id])
    ]).then(([[outletResult], [subResult]]) => {
      const hasActiveOutlet = (outletResult?.cnt || 0) > 0;
      const hasUnpaidSub = (subResult?.cnt || 0) > 0;
      res.json({ status: 'OK', data: { has_active_outlet: hasActiveOutlet, has_unpaid_subscription: hasUnpaidSub } });
    }).catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
  } catch(err) { res.status(500).json({ status: 'ERROR', message: err.message }); }
});

// ── Owner Outlet Detail ──────────────────────────────────
app.get('/api/owner/outlet-detail', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const DashboardModel = require('./services/model/dashboard.js');
  new DashboardModel(token).getOwnerOutletDetail(req, res);
});

app.post('/api/owner/outlet-transactions', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const DashboardModel = require('./services/model/dashboard.js');
  new DashboardModel(token).getOwnerOutletTransactions(req, res);
});

app.get('/api/owner/device-detail', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const DashboardModel = require('./services/model/dashboard.js');
  new DashboardModel(token).getOwnerDeviceDetail(req, res);
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

// ── Sales Pipeline ────────────────────────────────────────
app.get('/api/sales-pipeline/list', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const SalesPipelineModel = require('./services/model/sales_pipeline.js');
  new SalesPipelineModel(token).getPipelineList(req, res);
});

app.get('/api/sales-pipeline/detail', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const SalesPipelineModel = require('./services/model/sales_pipeline.js');
  new SalesPipelineModel(token).getPipelineDetail(req, res);
});

app.get('/api/sales-pipeline/approvals', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const SalesPipelineModel = require('./services/model/sales_pipeline.js');
  new SalesPipelineModel(token).getPendingApprovals(req, res);
});

app.post('/api/sales-pipeline/approve', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const SalesPipelineModel = require('./services/model/sales_pipeline.js');
  new SalesPipelineModel(token).approveEntity(req, res);
});

app.post('/api/sales-pipeline/reject', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const SalesPipelineModel = require('./services/model/sales_pipeline.js');
  new SalesPipelineModel(token).rejectEntity(req, res);
});

app.post('/api/sales-pipeline/approve-pipeline', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const SalesPipelineModel = require('./services/model/sales_pipeline.js');
  new SalesPipelineModel(token).approvePipeline(req, res);
});

// ── Project Tracker ────────────────────────────────────────
app.get('/api/project-tracker/list', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const ProjectTrackerModel = require('./services/model/project_tracker.js');
  new ProjectTrackerModel(token).getProjectTrackerList(req, res);
});

app.get('/api/project-tracker/detail', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const ProjectTrackerModel = require('./services/model/project_tracker.js');
  new ProjectTrackerModel(token).getProjectTrackerDetail(req, res);
});

app.post('/api/project-tracker/advance-milestone', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const ProjectTrackerModel = require('./services/model/project_tracker.js');
  new ProjectTrackerModel(token).advanceMilestone(req, res);
});

app.post('/api/project-tracker/create', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const ProjectTrackerModel = require('./services/model/project_tracker.js');
  const { pipeline_id, owner_id, approved_by } = req.body;
  new ProjectTrackerModel(token).createProjectTracker(pipeline_id, owner_id, approved_by)
    .then(result => {
      if (result.status === 'ERROR') {
        const statusCode = result.code || 500;
        return res.status(statusCode).json(result);
      }
      res.json(result);
    })
    .catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
});

// ── Partner Management ────────────────────────────────────────
app.get('/api/partner/list', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).getPartnerList(req, res);
});

app.get('/api/partner/detail', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).getPartnerDetail(req, res);
});

app.post('/api/partner/create', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).createPartner(req, res);
});

app.put('/api/partner/update', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).updatePartner(req, res);
});

app.post('/api/partner/delete', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).deletePartner(req, res);
});

app.get('/api/partner/my-partner', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).getMyPartner(req, res);
});

app.get('/api/sales-partner/list', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).getSalesPartnerList(req, res);
});

app.post('/api/sales-partner/create', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).createSalesPartner(req, res);
});

app.get('/api/sales-partner/detail', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).getSalesPartnerDetail(req, res);
});

app.put('/api/sales-partner/update', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).updateSalesPartner(req, res);
});

app.get('/api/lease-agreement/list', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).getLeaseAgreementList(req, res);
});

app.post('/api/lease-agreement/create', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).createLeaseAgreement(req, res);
});

app.put('/api/lease-agreement/update', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).updateLeaseAgreement(req, res);
});

app.post('/api/lease-agreement/delete', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const PartnerModel = require('./services/model/partner.js');
  new PartnerModel(token).deleteLeaseAgreement(req, res);
});

// ── Master Lease Agreement V2 ─────────────────────────────
app.post('/getLeaseAgreementListV2', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const LeaseAgreementV2Model = require('./services/model/lease_agreement_v2.js');
  new LeaseAgreementV2Model(token).getLeaseAgreementList(req, res);
});

app.post('/getLeaseAgreementDetailV2', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const LeaseAgreementV2Model = require('./services/model/lease_agreement_v2.js');
  new LeaseAgreementV2Model(token).getLeaseAgreementDetail(req, res);
});

app.post('/createLeaseAgreementV2', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const LeaseAgreementV2Model = require('./services/model/lease_agreement_v2.js');
  new LeaseAgreementV2Model(token).createLeaseAgreement(req, res);
});

app.post('/updateLeaseAgreementV2', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const LeaseAgreementV2Model = require('./services/model/lease_agreement_v2.js');
  new LeaseAgreementV2Model(token).updateLeaseAgreement(req, res);
});

app.post('/deleteLeaseAgreementV2', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const LeaseAgreementV2Model = require('./services/model/lease_agreement_v2.js');
  new LeaseAgreementV2Model(token).deleteLeaseAgreement(req, res);
});

app.post('/getOwnerListForAgreement', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const LeaseAgreementV2Model = require('./services/model/lease_agreement_v2.js');
  new LeaseAgreementV2Model(token).getOwnerList(req, res);
});

app.get('/api/devices-by-pipeline', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const BearerToken = require('./services/helpers/auth.js');
  const config = require('./services/config.js');
  const Esql = require('./services/helpers/entity.js');
  let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  let tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  const pipelineId = req.query.pipeline_id;
  if (!pipelineId) return res.json({ status: 'ERROR', message: 'pipeline_id wajib' });
  let esql = new Esql();
  esql.sqlQuery(
    `SELECT dc.*, dt.TypeName, o.OutletName 
     FROM sales_pipeline sp
     JOIN master_lease_agreement mla ON sp.PipelineId = mla.PipelineId
     JOIN device_controller dc ON mla.AgreementId = dc.AgreementId
     LEFT JOIN device_type dt ON dc.DeviceTypeId = dt.Id
     LEFT JOIN outlet o ON dc.OutletId = o.OutletId
     WHERE sp.PipelineId = ?`,
    [pipelineId]
  )
    .then(devices => res.json({ status: 'OK', data: devices }))
    .catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
});

app.post('/advancePipelineToOutlet', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const BearerToken = require('./services/helpers/auth.js');
  const config = require('./services/config.js');
  const Esql = require('./services/helpers/entity.js');
  const query = require('./services/query/query.js');
  let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  let tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(token, config.jwtAlgorithm.keyBase22);
  const userData = JSON.parse(decoded.gen);
  const { owner_id } = req.body;
  if (!owner_id) return res.json({ status: 'ERROR', message: 'owner_id wajib' });
  let esql = new Esql();
  // Find the latest pipeline for this owner that is at user_created milestone
  esql.sqlQuery('SELECT PipelineId FROM sales_pipeline WHERE OwnerId = ? AND CurrentMilestone = ? ORDER BY PipelineId DESC LIMIT 1', [owner_id, 'user_created'])
    .then(async (pipelines) => {
      if (!pipelines || pipelines.length === 0) {
        return res.json({ status: 'OK', message: 'No pipeline at user_created to advance' });
      }
      // Advance milestone using SP (it uses OwnerId internally but targets the right one)
      try {
        await esql.sqlProcedure(query.SP_UpdatePipelineMilestone, [owner_id, 'outlet_created', userData.user_id]);
        return res.json({ status: 'OK', message: 'Milestone advanced to outlet_created' });
      } catch(err) {
        console.error('advancePipelineToOutlet:', err.message || err);
        return res.json({ status: 'OK', message: 'Milestone already at or beyond outlet_created' });
      }
    })
    .catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
});

app.post('/createSalesPipeline', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const BearerToken = require('./services/helpers/auth.js');
  const config = require('./services/config.js');
  const Esql = require('./services/helpers/entity.js');
  const query = require('./services/query/query.js');
  let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  let tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(token, config.jwtAlgorithm.keyBase22);
  const userData = JSON.parse(decoded.gen);
  if (![1, 2, 6].includes(userData.role_id)) return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
  const { owner_id } = req.body;
  if (!owner_id) return res.json({ status: 'ERROR', message: 'owner_id wajib' });
  let esql = new Esql();
  // Always create a new pipeline (owner can have multiple pipelines/sales trackers)
  esql.sqlProcedure(query.SP_CreateSalesPipeline, [owner_id, userData.user_id])
    .then(async (result) => {
      // Get the newly created pipeline
      const [newPipeline] = await esql.sqlQuery(
        'SELECT PipelineId FROM sales_pipeline WHERE OwnerId = ? ORDER BY PipelineId DESC LIMIT 1', [owner_id]
      );
      return res.json({ status: 'OK', message: 'Pipeline berhasil dibuat', data: { PipelineId: newPipeline ? newPipeline.PipelineId : null } });
    })
    .catch(err => {
      // SP might reject if duplicate - in that case still OK
      if (err.msgError && err.msgError.sqlMessage && err.msgError.sqlMessage.includes('Duplicate')) {
        return res.json({ status: 'OK', code: 409, message: 'Pipeline sudah ada untuk owner ini' });
      }
      return res.status(500).json({ status: 'ERROR', message: err.message || 'Gagal membuat pipeline' });
    });
});

app.post('/getOwnersWithActiveOutlet', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const BearerToken = require('./services/helpers/auth.js');
  const config = require('./services/config.js');
  const Esql = require('./services/helpers/entity.js');
  let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  let tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  const search = req.body.search || '';
  let esql = new Esql();
  let query = `SELECT DISTINCT u.UserId, u.DisplayName, u.MobilePhone 
    FROM users u 
    INNER JOIN outlet o ON o.OwnerId = u.UserId AND o.IsActive = 1
    WHERE u.RoleId = 3 AND u.IsActive = 1`;
  const params = [];
  if (search) {
    query += ` AND (u.DisplayName LIKE ? OR u.MobilePhone LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY u.DisplayName ASC LIMIT 20';
  esql.sqlQuery(query, params)
    .then(owners => res.json({ status: 'OK', data: owners }))
    .catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
});

app.post('/getPipelineListForAgreement', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const LeaseAgreementV2Model = require('./services/model/lease_agreement_v2.js');
  new LeaseAgreementV2Model(token).getPipelineList(req, res);
});

app.post('/getSalesPartnerByPartnerId', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const LeaseAgreementV2Model = require('./services/model/lease_agreement_v2.js');
  new LeaseAgreementV2Model(token).getSalesPartnerByPartnerId(req, res);
});

// ── Agreement Invoice ─────────────────────────────────────
app.post('/createOrGetInvoice', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const AgreementInvoiceModel = require('./services/model/agreement_invoice.js');
  new AgreementInvoiceModel(token).createOrGetInvoice(req, res);
});

app.post('/getInvoiceList', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const AgreementInvoiceModel = require('./services/model/agreement_invoice.js');
  new AgreementInvoiceModel(token).getInvoiceList(req, res);
});

app.post('/getInvoiceDetail', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const AgreementInvoiceModel = require('./services/model/agreement_invoice.js');
  new AgreementInvoiceModel(token).getInvoiceDetail(req, res);
});

app.post('/updateInvoice', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const AgreementInvoiceModel = require('./services/model/agreement_invoice.js');
  new AgreementInvoiceModel(token).updateInvoice(req, res);
});

app.post('/deleteInvoice', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const AgreementInvoiceModel = require('./services/model/agreement_invoice.js');
  new AgreementInvoiceModel(token).deleteInvoice(req, res);
});

app.post('/getInvoicesByAgreement', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const AgreementInvoiceModel = require('./services/model/agreement_invoice.js');
  new AgreementInvoiceModel(token).getInvoicesByAgreement(req, res);
});

app.post('/getPipelineFlow', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const SalesPipelineModel = require('./services/model/sales_pipeline.js');
  new SalesPipelineModel(token).getPipelineFlow(req, res);
});

app.post('/getAgreementByPipeline', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Missing or invalid Authorization header' });
  const token = authHeader.split(' ')[1];
  const SalesPipelineModel = require('./services/model/sales_pipeline.js');
  new SalesPipelineModel(token).getAgreementByPipeline(req, res);
});

app.post('/updateIncentivePaymentStatus', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ status: 'ERROR', message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const BearerToken = require('./services/helpers/auth.js');
  const config = require('./services/config.js');
  const Esql = require('./services/helpers/entity.js');
  let bearer = new BearerToken(config.jwtAlgorithm.tokenType);
  let tokenResult = bearer.responseToken(token);
  if (tokenResult.status !== 'OK') return res.json(tokenResult);
  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(token, config.jwtAlgorithm.keyBase22);
  const userData = JSON.parse(decoded.gen);
  // Only roleId 1 and 6 can update
  if (![1, 6].includes(userData.role_id)) return res.status(403).json({ status: 'ERROR', message: 'Access denied' });
  const { type, id, status, notes } = req.body;
  if (!type || !id || !status) return res.json({ status: 'ERROR', message: 'Missing parameters' });
  if (!['paid', 'unpaid'].includes(status)) return res.json({ status: 'ERROR', message: 'Invalid status' });
  const table = type === 'partner' ? 'agreement_incentive_partner' : 'agreement_incentive_sales';
  let esql = new Esql();
  const updateNotes = notes ? `, Notes = '${notes.replace(/'/g, "''")}'` : '';
  esql.sqlQuery(`UPDATE ${table} SET PaymentStatus = ?${updateNotes} WHERE AgreementId = ?`, [status, id])
    .then(() => res.json({ status: 'OK', message: 'Payment status updated' }))
    .catch(err => res.status(500).json({ status: 'ERROR', message: err.message }));
});

// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});