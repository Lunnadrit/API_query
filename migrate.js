const db = require('./dbConnection');

db.run('ALTER TABLE users ADD COLUMN google_id TEXT', (err) => {
    if (err) {
        console.error("Ошибка:", err.message);
    } else {
        console.log("Колонка google_id успешно добавлена!");
    }
    db.close();
});
