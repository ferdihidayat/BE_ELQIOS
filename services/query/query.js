
//VIEW & QUERY//
const district = `
Select 
DistrictId,FindimID,FindimName,
LabelingId,Island,Province,District,SubDistrict 
From district
WHERE IsActive=1`;
const districtByName = `
Select 
DistrictId,FindimID,FindimName,LabelingId,Island,
Province,District,SubDistrict 
From district 
WHERE IsActive=1 AND FindimName LIKE ?`;
const outlet = 'Select * From VW_Outlet';
const outletList = 'Select * From VW_OutletList';
const outletOwnerList = 'Select * From VW_OutletOwnerList';
const outletByOwnerId = 'Select * From VW_Outlet WHERE OwnerId = ?';
const devicesBywnerId = 'Select * From VW_Devices WHERE OwnerId = ?';
const VW_OwnerByOutletCode = 'Select * From VW_OwnerByOutletCode WHERE OutletCode = ?';
const userByOutletCode = 'Select * From VW_UserByOutletCode WHERE DeviceCode = ?';
const devicePriceList = 'Select * From VW_DevicePriceList WHERE OwnerId = ? And DeviceCode = ?';
const CheckDeviceByNo = 'Select * From VW_CheckDeviceByNo WHERE MobilePhone = ? And uuid= ? And DeviceCode = ?';
const devicesStatusByOwnerId = 'Select * From VW_DevicesByStatus WHERE OwnerId = ?';
const devicesAvailableByOutletId = 'Select * From VW_Devices WHERE OutletId = ? And OwnerId = ? And StatusId=0';
const devicesByCode = 'Select * From VW_Devices WHERE DeviceCode = ?';
const devicesByOutletCode = 'Select * From VW_DevicesByOutletCode WHERE OutletCode= ?';
const setOnOffDevice = 'Update device_controller Set StatusId=? Where DeviceCode = ?';
const ownerList = 'Select * From VW_OwnerList';
const orderStatus = 'Select * From charge_trx WHERE OrderCode = ?';
const updateSignIn = `UPDATE users SET IsLogin = 1 WHERE MobilePhone = ? AND uuid = ?`;
const usersByCode = 'Select count(UserId) AS counter From users WHERE IsActive=1 AND IsLogin=1 AND uuid = ? LIMIT 1';
const walletAccount = 'Select * From VW_WalletAccount WHERE MobilePhone = ?';
const withdrawalTrx = 'Select * From VW_Withdrawal_MP WHERE MobilePhone = ?';
const withdrawalNeedApproval = 'Select * From VW_withdrawalNeedApproval WHERE UserApprovalId = ?';
const getPayloadWd = 'Select PayloadId From users Where RoleId = 1 And IsActive=1';
const getApiKeyMid = 'Select ServerKey From Outlet Where OutletCode = ? And IsActive=1';
const cekPassword = 'Select Password AS pwd From users Where UserId=? And uuid=? And IsActive=1';
const checkVersioning = `
SELECT dc.DeviceTypeId,dt.TypeCode,dt.AliasName,ot.Cert,concat(dt.TypeCode,dt.Versioning) as Versioning
FROM device_controller dc
JOIN device_type dt 
	ON	dc.DeviceTypeId = dt.Id
JOIN outlet ot
	ON	dc.OutletId = ot.OutletId
WHERE dc.IsActive=1 AND dt.IsActive=1 AND ot.IsActive = 1 AND dc.DeviceCode=?
`;
const dailyReport = `
SELECT 
OutletCode,OutletName,DeviceCode,AliasName,Duration,PaymentStatus,PaymentDate,PaymentDateOnly,AccountName,BankName,
BankNo,TotalGrossAmount,TotalAdminFee,TotalAmount,InvoiceNo
FROM VW_DailyReportCustomer 
WHERE OutletCode = ?
AND InsertDate BETWEEN ? AND ?
ORDER BY InsertDate DESC`

// Dashboard queries
const dashboardTrxH        = 'SELECT * FROM VW_TrxH';
const dashboardTrxHByPhone = 'SELECT * FROM VW_TrxH WHERE MobilePhone = ?';
const dashboardTrxD        = 'SELECT * FROM VW_TrxD';
const dashboardTrxDByPhone = 'SELECT * FROM VW_TrxD WHERE MobilePhone = ?';
const dashboardSummary        = 'SELECT * FROM VW_GetOutletSummary';
const dashboardSummaryByPhone = 'SELECT * FROM VW_GetOutletSummary WHERE MobilePhone = ?';
const dashboardRevenue        = 'SELECT * FROM VW_TotalRevenue';
const dashboardRevenueByPhone = 'SELECT * FROM VW_TotalRevenue WHERE MobilePhone = ?';
const updateDeviceStatus   = 'UPDATE device_controller SET StatusId=? WHERE DeviceCode=?';

// Owner/Partner Dashboard queries
const ownerMonthlyRevenue = `
SELECT 
  DATE_FORMAT(ct.PaymentDate, '%Y-%m') AS month,
  COUNT(*) AS total_trx,
  IFNULL(SUM(ct.GrossAmount), 0) AS total_gross,
  IFNULL(SUM(ct.Amount), 0) AS total_amount
FROM charge_trx ct
JOIN device_controller dc ON ct.DeviceCode = dc.DeviceCode
JOIN outlet ot ON dc.OutletId = ot.OutletId
JOIN users u ON ot.OwnerId = u.UserId
WHERE ct.PaymentStatus = 'settlement'
  AND u.MobilePhone = ?
  AND ct.PaymentDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY month
ORDER BY month ASC`;

const ownerDeviceSummary = `
SELECT 
  COUNT(*) AS total_device,
  SUM(CASE WHEN StatusId = 1 THEN 1 ELSE 0 END) AS active_device,
  SUM(CASE WHEN StatusId = 0 THEN 1 ELSE 0 END) AS inactive_device,
  SUM(CASE WHEN IsConnected = 1 THEN 1 ELSE 0 END) AS connected_device
FROM VW_TrxH WHERE MobilePhone = ?`;

const ownerDeviceByType = `
SELECT DeviceType, COUNT(*) AS total
FROM VW_TrxH WHERE MobilePhone = ?
GROUP BY DeviceType`;

const ownerTodayTrx = `
SELECT 
  COUNT(*) AS today_trx,
  IFNULL(SUM(ct.GrossAmount), 0) AS today_gross,
  IFNULL(SUM(ct.Amount), 0) AS today_amount
FROM charge_trx ct
JOIN device_controller dc ON ct.DeviceCode = dc.DeviceCode
JOIN outlet ot ON dc.OutletId = ot.OutletId
JOIN users u ON ot.OwnerId = u.UserId
WHERE ct.PaymentStatus = 'settlement'
  AND u.MobilePhone = ?
  AND DATE(ct.PaymentDate) = CURDATE()`;

const ownerRecentTrx = `
SELECT ct.OrderCode, ct.DeviceCode, dc.AliasName, ct.GrossAmount, ct.Amount, 
  ct.PaymentStatus, ct.PaymentDate, ct.Duration
FROM charge_trx ct
JOIN device_controller dc ON ct.DeviceCode = dc.DeviceCode
JOIN outlet ot ON dc.OutletId = ot.OutletId
JOIN users u ON ot.OwnerId = u.UserId
WHERE u.MobilePhone = ?
  AND ct.PaymentStatus = 'settlement'
ORDER BY ct.PaymentDate DESC
LIMIT 20`;

const ownerOutletSummaryMonth = `
SELECT 
  ot.OutletId, ot.OutletCode, ot.OutletName, ot.IsActive AS StatusId,
  (SELECT COUNT(*) FROM device_controller d WHERE d.OutletId = ot.OutletId AND d.IsActive = 1) AS TotalDevice,
  COUNT(ct.OrderCode) AS TotalTrx,
  IFNULL(SUM(ct.Amount), 0) AS TotalAmount
FROM outlet ot
JOIN users u ON ot.OwnerId = u.UserId
LEFT JOIN charge_trx ct ON ct.OutletCode = ot.OutletCode 
  AND ct.PaymentStatus = 'settlement'
  AND MONTH(ct.PaymentDate) = MONTH(CURDATE()) 
  AND YEAR(ct.PaymentDate) = YEAR(CURDATE())
WHERE u.MobilePhone = ?
GROUP BY ot.OutletId, ot.OutletCode, ot.OutletName, ot.IsActive`;
// Sales Pipeline queries
const pipelineList = `
  SELECT sp.PipelineId, sp.SalesTrackerCode, sp.OwnerId, sp.CurrentMilestone, sp.CreatedAt, sp.UpdatedAt,
    u_owner.DisplayName AS OwnerName, u_owner.MobilePhone AS OwnerPhone,
    u_creator.DisplayName AS CreatorName, u_creator.RoleId AS CreatorRole,
    (SELECT o.OutletId FROM outlet o WHERE o.OwnerId = sp.OwnerId ORDER BY o.OutletId DESC LIMIT 1) AS OutletId
  FROM sales_pipeline sp
  JOIN users u_owner ON sp.OwnerId = u_owner.UserId
  LEFT JOIN users u_creator ON sp.CreatedBy = u_creator.UserId
  WHERE 1=1`;

const pipelineByOwner = `SELECT * FROM sales_pipeline WHERE OwnerId = ? ORDER BY PipelineId DESC LIMIT 1`;

const pipelineMilestones = `
  SELECT * FROM sales_pipeline_milestone 
  WHERE PipelineId = ? ORDER BY CompletedAt ASC`;

const pendingApprovals = `
  SELECT spa.ApprovalId, spa.PipelineId, spa.EntityType, spa.EntityId, spa.Status,
    sp.OwnerId, u.DisplayName AS OwnerName,
    CASE 
      WHEN spa.EntityType = 'outlet' THEN o.OutletName
      WHEN spa.EntityType = 'device' THEN dc.AliasName
    END AS EntityName
  FROM sales_pipeline_approval spa
  JOIN sales_pipeline sp ON spa.PipelineId = sp.PipelineId
  JOIN users u ON sp.OwnerId = u.UserId
  LEFT JOIN outlet o ON spa.EntityType = 'outlet' AND spa.EntityId = o.OutletId
  LEFT JOIN device_controller dc ON spa.EntityType = 'device' AND spa.EntityId = dc.DeviceId
  WHERE spa.Status = 'pending'
  ORDER BY spa.ApprovalId DESC`;

//PROCEDURE//
const sp_createOutlet = 'CALL SP_CreateOutlet(?,?,?,?,?,?,?,?,?,?)';
const sp_checkUUID = 'CALL SP_CheckUUID(?)';
const sp_signUp = 'CALL SP_SignUp(?,?,?,?)';
const sp_signIn = 'CALL SP_SignIn(?,?)';
const sp_signOut = 'CALL SP_SignOut(?,?)';
const sp_createDevice = 'CALL SP_CreateDeviceController(?,?,?,?,?,?,?,?)';
const sp_updatePriceByDeviceId = 'CALL SP_UpdatePriceDevice(?,?,?)';
const sp_calculateOutletOutput = 'CALL SP_CalculateOutletOutput()';
const SP_UpdateDeviceStatus = 'CALL SP_UpdateDeviceStatus(?,?,?)';
const SP_Charge = 'CALL SP_ChargeTrx(?,?,?,?,?,?,?,?,?)';
const SP_HookMidtrans = 'CALL SP_HookMidtrans(?,?,?,?,?)';
const SP_PayChargeTrx = 'CALL SP_PayChargeTrx(?,?,?,?)';
const SP_SetMinPowerStandBy = 'CALL SP_SetMinPowerStandBy(?,?)';
const SP_CreateTicket = 'CALL SP_CreateTicket(?,?,?,?)';
const SP_RequestWithdrawalTrx = 'CALL SP_RequestWithdrawalTrx(?,?)';
const SP_DisbursementTrx = 'CALL SP_DisbursementTrx(?,?,?)';
const SP_SetPayloadId = 'CALL SP_SetPayloadId(?,?,?)'
const SP_SetUserPin = 'CALL SP_SetUserPin(?,?,?)'
const SP_SetMqttStatus = 'CALL SP_SetMqttStatus(?,?)';
const SP_CheckVersion = 'CALL SP_CheckVersion(?)';
const SP_ChangePassword = 'CALL SP_ChangePassword(?,?,?)';
const SP_UpdateDeviceStatusByNo = 'CALL SP_UpdateDeviceStatusByNo(?,?,?)';
const SP_SetDevicePriceList = 'CALL SP_SetDevicePriceList(?,?,?)';
const SP_GetDeviceByStack= 'CALL SP_GetDeviceByStack(?,?,?)';
const SP_SetOffDeviceMsg = 'CALL SP_SetOffDeviceStatusDaily()';
const SP_UpdateController = 'CALL SP_UpdateController(?,?,?,?,?,?,?,?,?)';
const SP_UpdateKiosk= 'CALL SP_UpdateKiosk(?,?,?)';

// Sales Pipeline Stored Procedures
const SP_CreateSalesPipeline = 'CALL SP_CreateSalesPipeline(?,?)';
const SP_UpdatePipelineMilestone = 'CALL SP_UpdatePipelineMilestone(?,?,?)';
const SP_ApprovePipelineEntity = 'CALL SP_ApprovePipelineEntity(?,?,?)';
const SP_RejectPipelineEntity = 'CALL SP_RejectPipelineEntity(?,?,?)';

// Project Tracker queries
const projectTrackerList = `
  SELECT a6.ProjectTrackerId, a6.PipelineId, a6.OwnerId, a6.CurrentMilestone, a6.CreatedAt, a6.UpdatedAt,
    a5.DisplayName AS OwnerName, a5.MobilePhone AS OwnerPhone,
    a4.OutletName, a4.OutletCode, a3.TotalDevice AS DeviceCount
  FROM sales_pipeline a1
  JOIN master_lease_agreement a2 ON a1.PipelineId = a2.PipelineId
  JOIN (
    SELECT OutletId, AgreementId, COUNT(DeviceId) AS TotalDevice 
    FROM device_controller 
    GROUP BY OutletId, AgreementId
  ) a3 ON a2.AgreementId = a3.AgreementId
  JOIN outlet a4 ON a3.OutletId = a4.OutletId
  JOIN users a5 ON a4.OwnerId = a5.UserId AND a5.IsActive = 1
  JOIN project_tracker a6 ON a1.PipelineId = a6.PipelineId AND a5.UserId = a6.OwnerId
  WHERE 1=1`;

const projectTrackerDetail = `
  SELECT pt.ProjectTrackerId, pt.PipelineId, pt.OwnerId, pt.CurrentMilestone, pt.ApprovedBy, pt.CreatedAt, pt.UpdatedAt,
    u_owner.DisplayName AS OwnerName, u_owner.MobilePhone AS OwnerPhone, u_owner.Email AS OwnerEmail,
    o.OutletId, o.OutletName, o.OutletCode, o.StatusId AS OutletStatus,
    dc.DeviceId, dc.DeviceCode, dc.AliasName AS DeviceName, dc.StatusId AS DeviceStatus,
    dt.TypeCode AS DeviceType
  FROM project_tracker pt
  LEFT JOIN users u_owner ON pt.OwnerId = u_owner.UserId
  LEFT JOIN master_lease_agreement mla ON mla.PipelineId = pt.PipelineId
  LEFT JOIN device_controller dc ON dc.AgreementId = mla.AgreementId
  LEFT JOIN outlet o ON dc.OutletId = o.OutletId
  LEFT JOIN device_type dt ON dc.DeviceTypeId = dt.Id
  WHERE pt.ProjectTrackerId = ?`;

const projectTrackerMilestones = `
  SELECT ptm.MilestoneId, ptm.MilestoneName, ptm.CompletedAt, ptm.CompletedBy, ptm.Notes,
    u.DisplayName AS CompletedByName
  FROM project_tracker_milestone ptm
  LEFT JOIN users u ON ptm.CompletedBy = u.UserId
  WHERE ptm.ProjectTrackerId = ?
  ORDER BY ptm.CompletedAt ASC`;

// Project Tracker Stored Procedures
const SP_CreateProjectTracker = 'CALL SP_CreateProjectTracker(?,?,?)';
const SP_AdvanceProjectMilestone = 'CALL SP_AdvanceProjectMilestone(?,?,?)';

// Partner Management queries
const partnerList = `SELECT * FROM partners WHERE 1=1`;
const partnerById = `SELECT * FROM partners WHERE PartnerId = ?`;
const partnerByUser = `SELECT p.* FROM partners p JOIN users u ON u.PartnerId = p.PartnerId WHERE u.UserId = ?`;

// Sales Partner queries
const salesPartnerList = `SELECT sp.*, p.CompanyName AS PartnerName FROM sales_partner sp JOIN partners p ON sp.PartnerId = p.PartnerId WHERE 1=1`;
const salesPartnerByPartner = `SELECT * FROM sales_partner WHERE PartnerId = ? ORDER BY CreatedAt DESC`;

// Master Lease Agreement queries
const leaseAgreementList = `SELECT mla.*, p.CompanyName AS PartnerName FROM master_lease_agreement mla JOIN partners p ON mla.PartnerId = p.PartnerId WHERE 1=1`;
const leaseAgreementsByPartner = `SELECT * FROM master_lease_agreement WHERE PartnerId = ?`;

// Master Lease Agreement V2 queries
const leaseAgreementListV2 = `SELECT mla.AgreementId, mla.AgreementNumber, mla.OwnerId, mla.PartnerId, mla.DeviceCount, mla.DownPayment, mla.SubscriptionPlanId, mla.SubscriptionId, mla.RegistrationDate, mla.Status, mla.PipelineId, mla.Notes, mla.CreatedAt, mla.UpdatedAt, u.DisplayName AS OwnerName, p.CompanyName AS PartnerName, sp.PlanName AS SubscriptionPlanName, sp.Price AS SubscriptionPrice, sp.BillingCycle AS SubscriptionCycle, sp.MaxDevices AS SubscriptionMaxDevices, os.StartDate, os.EndDate, os.Status AS SubscriptionStatus, os.PaymentStatus AS SubscriptionPaymentStatus FROM master_lease_agreement mla JOIN users u ON mla.OwnerId = u.UserId LEFT JOIN partners p ON mla.PartnerId = p.PartnerId LEFT JOIN subscription_plan sp ON mla.SubscriptionPlanId = sp.PlanId LEFT JOIN owner_subscription os ON mla.SubscriptionId = os.SubscriptionId WHERE 1=1`;

// Agreement Incentive queries
const salesPartnerByPartnerId = `SELECT SalesPartnerId, ProspectName FROM sales_partner WHERE PartnerId = ? ORDER BY ProspectName ASC`;
const incentivePartnerByAgreement = `SELECT aip.*, p.ContactPerson FROM agreement_incentive_partner aip LEFT JOIN master_lease_agreement mla ON mla.AgreementId = aip.AgreementId LEFT JOIN partners p ON mla.PartnerId = p.PartnerId WHERE aip.AgreementId = ?`;
const incentiveSalesByAgreement = `SELECT ais.*, sp.ProspectName FROM agreement_incentive_sales ais LEFT JOIN sales_partner sp ON ais.SalesPartnerId = sp.SalesPartnerId WHERE ais.AgreementId = ?`;
const deleteIncentivePartner = `DELETE FROM agreement_incentive_partner WHERE AgreementId = ?`;
const deleteIncentiveSales = `DELETE FROM agreement_incentive_sales WHERE AgreementId = ?`;

// Partner Management Stored Procedures
const SP_CreatePartner = 'CALL SP_CreatePartner(?,?,?,?,?,?,?,?,?)';
const SP_UpdatePartner = 'CALL SP_UpdatePartner(?,?,?,?,?,?,?,?,?,?)';
const SP_DeletePartner = 'CALL SP_DeletePartner(?)';
const SP_CreateSalesPartner = 'CALL SP_CreateSalesPartner(?,?,?,?,?,?,?)';
const SP_CreateLeaseAgreement = 'CALL SP_CreateLeaseAgreement(?,?,?,?,?,?,?)';
const SP_UpdateLeaseAgreement = 'CALL SP_UpdateLeaseAgreement(?,?,?,?,?,?,?,?)';
const SP_DeleteLeaseAgreement = 'CALL SP_DeleteLeaseAgreement(?)';

// Master Lease Agreement V2 Stored Procedures
const SP_CreateLeaseAgreementV2 = 'CALL SP_CreateLeaseAgreementV2(?,?,?,?,?,?,?,?)';
const SP_DeleteLeaseAgreementV2 = 'CALL SP_DeleteLeaseAgreementV2(?)';
const SP_UpdateLeaseAgreementV2 = 'CALL SP_UpdateLeaseAgreementV2(?,?,?,?,?,?,?,?,?)';

module.exports = {
    district, districtByName, ownerList,withdrawalTrx,withdrawalNeedApproval,
    outlet,outletList,outletByOwnerId,userByOutletCode, devicesBywnerId,devicesStatusByOwnerId,VW_OwnerByOutletCode,devicesAvailableByOutletId, devicesByCode,setOnOffDevice,devicesByOutletCode,getPayloadWd,cekPassword,devicePriceList,CheckDeviceByNo,getApiKeyMid,
    sp_createOutlet, updateSignIn, usersByCode,walletAccount,dailyReport,outletOwnerList,checkVersioning,
    sp_checkUUID, sp_signUp, sp_signIn, sp_signOut,orderStatus,
    sp_createDevice, sp_updatePriceByDeviceId,sp_calculateOutletOutput,
    SP_UpdateDeviceStatus, SP_Charge, SP_HookMidtrans, SP_PayChargeTrx,SP_SetMinPowerStandBy,
    SP_CreateTicket,SP_RequestWithdrawalTrx,SP_DisbursementTrx,SP_SetPayloadId,
    SP_SetUserPin,SP_SetMqttStatus,SP_CheckVersion,SP_ChangePassword,SP_UpdateDeviceStatusByNo,SP_SetDevicePriceList,SP_GetDeviceByStack,SP_SetOffDeviceMsg,SP_UpdateController,SP_UpdateKiosk,
    // dashboard
    dashboardTrxH, dashboardTrxHByPhone,
    dashboardTrxD, dashboardTrxDByPhone,
    dashboardSummary, dashboardSummaryByPhone,
    dashboardRevenue, dashboardRevenueByPhone,
    updateDeviceStatus,
    // owner/partner dashboard
    ownerMonthlyRevenue, ownerDeviceSummary, ownerDeviceByType, ownerTodayTrx, ownerRecentTrx, ownerOutletSummaryMonth,
    // profile
    getOwnerProfile: `SELECT u.UserId, u.DisplayName, u.MobilePhone, u.Email, ot.OutletId, ot.OutletCode, ot.OutletName 
      FROM users u JOIN outlet ot ON ot.OwnerId = u.UserId 
      WHERE u.MobilePhone = ? AND u.IsActive = 1 AND ot.IsActive = 1`,
    updateOutletName: `UPDATE outlet SET OutletName = ? WHERE OutletId = ? AND OwnerId = ?`,
    updateDisplayName: `UPDATE users SET DisplayName = ? WHERE UserId = ? AND IsActive = 1`,
    updatePassword: `UPDATE users SET Password = ? WHERE UserId = ? AND IsActive = 1`,
    // bank account
    getBankList: `SELECT Id, BankCode, BankName, BankShort FROM banks ORDER BY BankName`,
    getOwnerBankAccount: `SELECT ba.BankId, ba.BankNo, ba.BankName, ba.AccountName, ba.Description, ot.OutletId, ot.OutletCode, ot.OutletName
      FROM bank_account ba
      JOIN outlet ot ON ot.BankAccountId = ba.BankId
      JOIN users u ON ot.OwnerId = u.UserId
      WHERE u.MobilePhone = ? AND ot.IsActive = 1 AND ba.IsActive = 1`,
    updateBankAccount: `UPDATE bank_account SET BankNo = ?, BankName = ?, AccountName = ? WHERE BankId = ?`,
    // sales pipeline
    pipelineList, pipelineByOwner, pipelineMilestones, pendingApprovals,
    SP_CreateSalesPipeline, SP_UpdatePipelineMilestone, SP_ApprovePipelineEntity, SP_RejectPipelineEntity,
    // project tracker
    projectTrackerList, projectTrackerDetail, projectTrackerMilestones,
    SP_CreateProjectTracker, SP_AdvanceProjectMilestone,
    // partner management
    partnerList, partnerById, partnerByUser,
    salesPartnerList, salesPartnerByPartner,
    leaseAgreementList, leaseAgreementsByPartner, leaseAgreementListV2,
    SP_CreatePartner, SP_UpdatePartner, SP_DeletePartner,
    SP_CreateSalesPartner, SP_CreateLeaseAgreement, SP_UpdateLeaseAgreement, SP_DeleteLeaseAgreement,
    SP_CreateLeaseAgreementV2,
    SP_DeleteLeaseAgreementV2,
    SP_UpdateLeaseAgreementV2,
    // agreement incentive
    salesPartnerByPartnerId, incentivePartnerByAgreement, incentiveSalesByAgreement,
    deleteIncentivePartner, deleteIncentiveSales
};