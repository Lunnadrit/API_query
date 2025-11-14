const jwt = require('jsonwebtoken');
const db = require('../dbConnection');

exports.getUser = async (req, res, next) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith('Bearer') ||
            !req.headers.authorization.split(' ')[1]
        ) {
            return res.status(422).json({
                message: "Please provide the token",
            });
        }

        const theToken = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(theToken, 'the-super-strong-secret');

        const row = await db.get(
            "SELECT id, name, email FROM users WHERE id = ?",
            [decoded.id]
        );

        if (row) {
            return res.json({
                user: row
            });
        }

        res.json({
            message: "No user found"
        });
    } catch (err) {
        next(err);
    }
};