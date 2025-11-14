const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../dbConnection');

exports.register = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        // Проверка существования email
        const row = await db.get(
            "SELECT email FROM users WHERE email = ?",
            [req.body.email]
        );

        if (row) {
            return res.status(201).json({
                message: "The E-mail already in use",
            });
        }

        // Хеширование пароля
        const hashPass = await bcrypt.hash(req.body.password, 12);

        // Вставка пользователя
        const result = await db.run(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [req.body.name, req.body.email, hashPass]
        );

        if (result.changes === 1) {
            return res.status(201).json({
                message: "The user has been successfully inserted.",
            });
        }
    } catch (err) {
        next(err);
    }
};