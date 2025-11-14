const { validationResult } = require("express-validator");
const bcrypt = require('bcryptjs');
const db = require("../dbConnection");

// Главная страница (после входа)
exports.homePage = async (req, res, next) => {
    if (!req.session.userID) {
        return res.redirect('/login');
    }

    try {
        const row = await db.get("SELECT * FROM users WHERE id = ?", [req.session.userID]);

        if (!row) {
            return res.redirect('/logout');
        }

        res.render('home', {
            user: row
        });
    } catch (error) {
        next(error);
    }
};

// Страница регистрации
exports.registerPage = (req, res) => {
    if (req.session.userID) {
        return res.redirect('/');
    }
    res.render("register");
};

// Обработка регистрации
exports.register = async (req, res, next) => {
    if (req.session.userID) {
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
    if (req.session.userID) {
        return res.redirect('/');
    }
    res.render("login");
};

// Обработка входа
exports.login = async (req, res, next) => {
    if (req.session.userID) {
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
            req.session.userID = row.id;
            return res.redirect('/');
        }

        res.render('login', {
            error: 'Неверный пароль'
        });
    } catch (error) {
        next(error);
    }
};

// Выход
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.redirect('/login');
    });
};