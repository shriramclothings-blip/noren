'use strict';

const router = require('express').Router();
const { auth, requireRole, requireAnyPermission } = require('../middleware/auth');
const empCtrl = require('../controllers/employeeController');

// All admin-level roles that can manage or view employees
const employeeGuard = [
  auth,
  requireRole(
    'super_admin', 'admin', 'business_owner',
    'store_admin', 'store_manager', 'warehouse_manager',
    'accountant', 'employee'
  ),
];

router.get('/',       ...employeeGuard, empCtrl.listEmployees);
router.post('/',      auth, requireRole('super_admin','admin','business_owner','store_admin'), empCtrl.createEmployee);
router.put('/:id',    auth, requireRole('super_admin','admin','business_owner','store_admin'), empCtrl.updateEmployee);
router.delete('/:id', auth, requireRole('super_admin','admin','business_owner'), empCtrl.deleteEmployee);

module.exports = router;
