import { Department } from '../models/Department.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDepartments = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { isActive: true };
  if (req.params.hospitalId) filter.hospitalId = req.params.hospitalId;
  if (req.query.hospitalId) filter.hospitalId = req.query.hospitalId;
  const departments = await Department.find(filter).populate('headDoctor').sort('name');
  res.json({ success: true, data: departments });
});

export const getDepartmentsByHospital = asyncHandler(async (req, res) => {
  const departments = await Department.find({
    hospitalId: req.params.hospitalId,
    isActive: true,
  }).sort('name');
  res.json({ success: true, data: departments });
});

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await Department.create(req.body);
  res.status(201).json({ success: true, data: department });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!department) throw new AppError('Department not found', 404);
  res.json({ success: true, data: department });
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!department) throw new AppError('Department not found', 404);
  res.json({ success: true, message: 'Department deactivated' });
});
