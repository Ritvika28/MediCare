import { Router } from 'express';
import * as departmentController from '../controllers/departmentController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/', departmentController.getDepartments);
router.get('/hospital/:hospitalId', departmentController.getDepartmentsByHospital);

router.use(protect, restrictTo('admin'));
router.post('/', departmentController.createDepartment);
router.patch('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

export default router;
