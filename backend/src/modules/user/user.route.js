import express from 'express';
import { userController } from './user.controller.js';
import validate from '../../middlewares/validate.js';
import { userValidation } from './user.validation.js';

const router = express.Router();

router.post('/register', validate(userValidation.registerUser), userController.registerUser);
router.get('/', userController.getAllUsers);
router.get('/:userId', validate(userValidation.getUser), userController.getUser);

export const userRoutes = router;
