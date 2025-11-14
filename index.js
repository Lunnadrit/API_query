const express = require('express');
const session = require('express-session');
const path = require('path');

// Импорт маршрутов
const apiRoutes = require('./routes');        // API routes (ПР2)
const webRoutes = require('./routes-web');    // Web routes (ПР3)

const app = express();

// Настройка EJS для веб-интерфейса
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());                      // для API (JSON)
app.use(express.urlencoded({ extended: true })); // для веб-форм
app.use(express.static(path.join(__dirname, 'public'))); // статические файлы

// Сессии для веб-интерфейса
app.use(session({
    name: 'session',
    secret: 'my_secret_key_12345',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 3600 * 1000, // 1 час
    }
}));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Маршруты
app.use('/api', apiRoutes);    // API под префиксом /api
app.use('/', webRoutes);       // Веб-интерфейс по корневому пути

// Тестовый endpoint
app.get('/test', (req, res) => {
    res.json({
        message: 'Server is working!',
        api: 'http://localhost:3000/api',
        web: 'http://localhost:3000'
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Обработка 404
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'API route not found' });
    } else {
        res.status(404).send('Страница не найдена');
    }
});

app.listen(3000, () => {
    console.log('🚀 Сервер запущен на порту 3000');
    console.log('📊 API: http://localhost:3000/api');
    console.log('🌐 Веб-интерфейс: http://localhost:3000');
    console.log('🧪 Тест: http://localhost:3000/test');
});