const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const db = require('../dbConnection');

exports.login = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        const row = await db.get(
            "SELECT * FROM users WHERE email = ?",
            [req.body.email]
        );

        if (!row) {
            return res.status(422).json({
                message: "Invalid email address",
            });
        }

        const passMatch = await bcrypt.compare(req.body.password, row.password);
        if (!passMatch) {
            return res.status(422).json({
                message: "Incorrect password",
            });
        }

        const theToken = jwt.sign(
            { id: row.id },
            'the-super-strong-secret',
            { expiresIn: '1h' }
        );

        return res.json({
            token: theToken
        });
    } catch (err) {
        next(err);
    }
};