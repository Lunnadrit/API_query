const router = require("express").Router();
const { body } = require("express-validator");

const passport = require("passport");

const {
    homePage,
    register,
    registerPage,
    login,
    loginPage,
    logout
} = require("./controllers-web/userController");

// Упрощенные проверки аутентификации через Passport
const ifNotLoggedin = (req, res, next) => {
    if(!req.isAuthenticated()){
        return res.redirect('/login');
    }
    next();
}

const ifLoggedin = (req, res, next) => {
    if(req.isAuthenticated()){
        return res.redirect('/');
    }
    next();
}

// Основные маршруты
router.get('/', ifNotLoggedin, homePage);

router.get("/login", ifLoggedin, loginPage);

router.post("/login", ifLoggedin, login);

router.get("/signup", ifLoggedin, registerPage);

router.post("/signup", ifLoggedin, register);

// ==================================================
//               GITHUB OAUTH МАРШРУТЫ
// ==================================================
router.get(
    '/auth/github',
    ifLoggedin,
    passport.authenticate('github', { scope: ['user:email'] })
);

router.get(
    '/auth/github/callback',
    passport.authenticate('github', {
        failureRedirect: '/login',
        failureMessage: true
    }),
    (req, res) => {
        console.log('GitHub callback - success, user:', req.user);
        res.redirect('/');
    }
);

// ==================================================
//               GOOGLE OAUTH МАРШРУТЫ
// ==================================================
router.get(
    '/auth/google',
    ifLoggedin,
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
    '/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        failureMessage: true
    }),
    (req, res) => {
        console.log('Google callback - success, user:', req.user);
        res.redirect('/');
    }
);

// Выход
router.get('/logout', logout);

module.exports = router;