import catchAsync from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/response.js';
import { userService } from './user.service.js';

const registerUser = catchAsync(async (req, res) => {
  const user = await userService.registerUser(req.body);
  return sendResponse(res, 201, 'User registered successfully', user);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  return sendResponse(res, 200, 'User fetched successfully', user);
});

const getAllUsers = catchAsync(async (req, res) => {
  const users = await userService.getAllUsers();
  return sendResponse(res, 200, 'Users fetched successfully', users);
});

export const userController = {
  registerUser,
  getUser,
  getAllUsers,
};
