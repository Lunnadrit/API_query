const router = require('express').Router();
const { body } = require('express-validator');

const { register } = require('./controllers/registerController');
const { login } = require('./controllers/loginController');
const { getUser } = require('./controllers/getUserController');

// POST /api/register
router.post('/register', [
    body('name')
        .notEmpty()
        .escape()
        .trim()
        .isLength({ min: 3 })
        .withMessage('The name must be of minimum 3 characters length'),
    body('email')
        .notEmpty()
        .escape()
        .trim()
        .isEmail()
        .withMessage('Invalid email address'),
    body('password')
        .notEmpty()
        .trim()
        .isLength({ min: 4 })
        .withMessage('The Password must be of minimum 4 characters length')
], register);

// POST /api/login
router.post('/login', [
    body('email')
        .notEmpty()
        .escape()
        .trim()
        .isEmail()
        .withMessage('Invalid email address'),
    body('password')
        .notEmpty()
        .trim()
        .isLength({ min: 4 })
        .withMessage('The Password must be of minimum 4 characters length')
], login);

// GET /api/getuser
router.get('/getuser', getUser);

module.exports = router;