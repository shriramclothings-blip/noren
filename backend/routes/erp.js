const router = require('express').Router();
const { auth, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const erp = require('../controllers/erpController');
const domainCtrl = require('../controllers/domainController');
const whCtrl = require('../controllers/warehouseController');
const sysCtrl = require('../controllers/systemController');

const adminRoles = ['admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee'];
const adminGuard = [auth, requireRole(...adminRoles)];
const superAdminGuard = [auth, requireRole('super_admin', 'admin')];
const dashboardGuard = [...adminGuard, requirePermission('erp.view_dashboard')];
const posGuard = [...adminGuard, requireAnyPermission('erp.manage_pos', 'erp.manage_orders', 'erp.manage_finance')];
const inventoryGuard = [...adminGuard, requirePermission('erp.manage_inventory')];
const warehouseGuard = [...adminGuard, requireAnyPermission('erp.manage_warehouse', 'erp.manage_inventory')];
const reportsGuard = [...adminGuard, requirePermission('erp.view_reports')];
const settingsGuard = [...adminGuard, requirePermission('erp.manage_settings')];
const auditGuard = [...adminGuard, requirePermission('erp.view_audit_logs')];

router.get('/dashboard', ...dashboardGuard, erp.getDashboard);
router.get('/bootstrap', ...dashboardGuard, erp.getBootstrap);
router.get('/modules', ...adminGuard, erp.getModules);
router.get('/tenant', ...adminGuard, erp.getTenantInfo);
router.get('/pos/overview', ...posGuard, erp.getPosOverview);
router.get('/inventory/overview', ...inventoryGuard, erp.getInventoryOverview);
router.get('/warehouse/overview', ...warehouseGuard, erp.getWarehouseOverview);
router.post('/warehouse/transfer', ...warehouseGuard, erp.createWarehouseTransfer);
router.post('/warehouse/damage',   ...warehouseGuard, erp.recordDamage);
router.post('/warehouse/count',    ...warehouseGuard, erp.recordStockCount);
router.get('/reports/overview', ...reportsGuard, erp.getReportsOverview);
router.get('/audit-logs', ...auditGuard, erp.getAuditLogs);
router.get('/audit-logs/paginated', ...auditGuard, erp.listAuditLogs);
router.get('/audit-logs/export',    ...auditGuard, erp.exportAuditLogs);
router.get('/settings', ...settingsGuard, erp.getSettings);
router.put('/settings', ...settingsGuard, erp.updateSettings);

// Store Management
router.post('/stores', ...settingsGuard, erp.createStore);
router.put('/stores/:id', ...settingsGuard, erp.updateStore);
router.delete('/stores/:id', ...settingsGuard, erp.deleteStore);

// Business Management (super_admin only)
router.get('/businesses', ...superAdminGuard, erp.listBusinesses);
router.post('/businesses', ...superAdminGuard, erp.createBusiness);
router.put('/businesses/:id', ...superAdminGuard, erp.updateBusiness);
router.delete('/businesses/:id', ...superAdminGuard, erp.deleteBusiness);
router.patch('/businesses/:id/suspend', ...superAdminGuard, erp.suspendBusiness);

// Warehouse Management
router.get('/warehouses', ...adminGuard, erp.listWarehouses);
router.post('/warehouses', ...settingsGuard, erp.createWarehouse);
router.put('/warehouses/:id', ...settingsGuard, erp.updateWarehouse);
router.delete('/warehouses/:id', ...settingsGuard, erp.deleteWarehouse);

// Store listing (accessible to settings guard)
router.get('/stores', ...settingsGuard, erp.listStores);

router.get('/domains', ...superAdminGuard, domainCtrl.listDomains);
router.post('/domains', ...superAdminGuard, domainCtrl.createDomain);
router.put('/domains/:id', ...superAdminGuard, domainCtrl.updateDomain);
router.delete('/domains/:id', ...superAdminGuard, domainCtrl.deleteDomain);

// ── Phase 2: Warehouse zones, bins, transfer requests ─────────────────────────
const warehouseGuardP2 = [...adminGuard, requireAnyPermission('erp.manage_warehouse', 'erp.manage_inventory')];
const approveGuard     = [...adminGuard, requirePermission('erp.approve_transfers')];

router.get('/warehouse/zones',                    ...warehouseGuardP2, whCtrl.listZones);
router.post('/warehouse/zones',                   ...warehouseGuardP2, whCtrl.createZone);
router.put('/warehouse/zones/:id',                ...warehouseGuardP2, whCtrl.updateZone);
router.get('/warehouse/bins',                     ...warehouseGuardP2, whCtrl.listBins);
router.post('/warehouse/bins',                    ...warehouseGuardP2, whCtrl.createBin);
router.put('/warehouse/bins/:id',                 ...warehouseGuardP2, whCtrl.updateBin);
router.get('/warehouse/transfer-requests',        ...warehouseGuardP2, whCtrl.listTransferRequests);
router.post('/warehouse/transfer-requests',       ...warehouseGuardP2, whCtrl.createTransferRequest);
router.post('/warehouse/transfer-requests/:id/approve', ...approveGuard, whCtrl.approveTransfer);
router.post('/warehouse/transfer-requests/:id/reject',  ...approveGuard, whCtrl.rejectTransfer);

// ── Phase 2: Session management ───────────────────────────────────────────────
router.get('/sessions/live',         ...adminGuard, sysCtrl.getLiveSessions);
router.delete('/sessions/:sessionId', ...superAdminGuard, sysCtrl.terminateSession);
router.get('/sessions/history',      ...adminGuard, sysCtrl.getLoginHistory);

// ── Phase 2: System health + global analytics (super_admin) ───────────────────
router.get('/system/health',          ...superAdminGuard, sysCtrl.getSystemHealth);
router.get('/system/global-revenue',  ...superAdminGuard, sysCtrl.getGlobalRevenue);
router.get('/system/users',           ...superAdminGuard, sysCtrl.getAllUsers);

// ── Phase 2: Role-based dashboard ─────────────────────────────────────────────
router.get('/dashboard/role', ...adminGuard, sysCtrl.getRoleDashboard);

// ── Phase 2: Call logs ────────────────────────────────────────────────────────
router.get('/communications/call-logs',     ...adminGuard, sysCtrl.getCallLogs);
router.get('/communications/call-logs/all', ...adminGuard, sysCtrl.getAllCallLogs);

module.exports = router;
