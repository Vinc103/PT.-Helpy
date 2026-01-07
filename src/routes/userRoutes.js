const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', UserController.getUsers);
router.get('/search', UserController.searchUsers);
router.get('/:id', UserController.getUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;