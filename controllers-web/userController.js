const { validationResult } = require("express-validator");
const bcrypt = require('bcryptjs');
const db = require("../dbConnection");
const passport = require("passport");

// Главная страница (после входа)
exports.homePage = async (req, res, next) => {
    // Используем Passport аутентификацию вместо req.session.userID
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        // req.user уже содержит данные пользователя из Passport
        res.render('home', {
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

// Страница регистрации
exports.registerPage = (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render("register");
};

// Обработка регистрации
exports.register = async (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }

    const errors = validationResult(req);
    const { name, email, password } = req.body;

    if (!errors.isEmpty()) {
        return res.render('register', {
            error: errors.array()[0].msg
        });
    }

    try {
        // Проверяем существование email
        const existingUser = await db.get("SELECT * FROM users WHERE email = ?", [email]);

        if (existingUser) {
            return res.render('register', {
                error: 'Этот email уже используется'
            });
        }

        // Хешируем пароль
        const hashPass = await bcrypt.hash(password, 12);

        // Сохраняем пользователя
        const result = await db.run(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashPass]
        );

        if (result.changes === 1) {
            return res.render("register", {
                msg: 'Регистрация успешна! Теперь вы можете войти.'
            });
        }

        return res.render('register', {
            error: 'Ошибка при регистрации'
        });
    } catch (error) {
        next(error);
    }
};

// Страница входа
exports.loginPage = (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render("login");
};

// Обработка входа (локальная аутентификация)
exports.login = async (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }

    const errors = validationResult(req);
    const { email, password } = req.body;

    if (!errors.isEmpty()) {
        return res.render('login', {
            error: errors.array()[0].msg
        });
    }

    try {
        const row = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        if (!row) {
            return res.render('login', {
                error: 'Неверный email'
            });
        }

        const checkPass = await bcrypt.compare(password, row.password);

        if (checkPass) {
            // Используем Passport для логина вместо прямой работы с сессией
            req.login(row, (err) => {
                if (err) {
                    return next(err);
                }
                return res.redirect('/');
            });
        } else {
            res.render('login', {
                error: 'Неверный пароль'
            });
        }
    } catch (error) {
        next(error);
    }
};

// Выход
exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.redirect('/login');
        });
    });
};