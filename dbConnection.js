const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных (создастся автоматически)
const dbPath = path.join(__dirname, 'database.sqlite');

// Создание подключения
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');

        // Создание таблицы пользователей (для новых БД сразу с github_id)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            github_id TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log('Users table ready.');
            }
        });

        // Миграция для старой таблицы (добавляем колонку, если её не было)
        db.run(`ALTER TABLE users ADD COLUMN github_id TEXT`, (err) => {
            if (err) {
                if (!/duplicate column name/i.test(err.message)) {
                    console.error('Error adding github_id column:', err.message);
                }
            } else {
                console.log('Column github_id added to users table.');
            }
        });
    }
});

// Экспорт с поддержкой промисов
module.exports = {
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    },

    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};
