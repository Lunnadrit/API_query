const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const db = require('./dbConnection');
const apiRoutes = require('./routes');
const webRoutes = require('./routes-web');

const app = express();

// ---------------- VIEW ENGINE (EJS) ----------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ---------------- MIDDLEWARE ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- СЕССИИ ----------------
app.use(session({
    name: 'session',
    secret: 'my_secret_key_12345',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 3600 * 1000 // 1 час
    }
}));

// ---------------- PASSPORT ----------------
app.use(passport.initialize());
app.use(passport.session());

// В сессии хранится только id пользователя
passport.serializeUser((user, done) => {
    console.log('Serialize user:', user.id);
    done(null, user.id);
});

// По id достаём пользователя из БД
passport.deserializeUser(async (id, done) => {
    try {
        console.log('Deserialize user ID:', id);
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        console.log('Deserialized user:', user);
        done(null, user || null);
    } catch (err) {
        console.error('Deserialize error:', err);
        done(err);
    }
});

// ==================================================
//               GOOGLE OAUTH 2.0
// ==================================================
passport.use(new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const googleId = profile.id;
            const email = profile.emails && profile.emails[0]
                ? profile.emails[0].value
                : null;

            const name = profile.displayName
                || (email ? email.split('@')[0] : 'Google user');

            console.log('Google profile:', {
                id: googleId,
                email,
                name
            });

            // 1. Ищем пользователя по google_id
            let user = await db.get(
                'SELECT * FROM users WHERE google_id = ?',
                [googleId]
            );

            // 2. Если не нашли — пробуем по email и привязываем google_id
            if (!user && email) {
                user = await db.get(
                    'SELECT * FROM users WHERE email = ?',
                    [email]
                );

                if (user && !user.google_id) {
                    await db.run(
                        'UPDATE users SET google_id = ? WHERE id = ?',
                        [googleId, user.id]
                    );
                }
            }

            // 3. Если пользователя вообще нет — создаём нового
            if (!user) {
                const fakePassword = 'google_' + googleId;

                const result = await db.run(
                    'INSERT INTO users (name, email, password, google_id) VALUES (?, ?, ?, ?)',
                    [
                        name,
                        email || `${googleId}@google.local`,
                        fakePassword,
                        googleId
                    ]
                );

                user = await db.get(
                    'SELECT * FROM users WHERE id = ?',
                    [result.lastID]
                );
            }

            console.log('Google auth successful, user:', user);
            return done(null, user);
        } catch (err) {
            console.error('Error in GoogleStrategy:', err);
            return done(err);
        }
    }
));

// ==================================================
//               GITHUB OAUTH 2.0
// ==================================================
passport.use(new GitHubStrategy(
    {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const githubId = profile.id;
            const name = profile.displayName || profile.username;
            const email = profile.emails && profile.emails[0]
                ? profile.emails[0].value
                : null;

            console.log('GitHub profile:', {
                id: githubId,
                email,
                name
            });

            // 1. Ищем пользователя по github_id
            let user = await db.get(
                'SELECT * FROM users WHERE github_id = ?',
                [githubId]
            );

            // 2. Если не нашли — пробуем по email (и привязываем GitHub)
            if (!user && email) {
                user = await db.get(
                    'SELECT * FROM users WHERE email = ?',
                    [email]
                );

                if (user && !user.github_id) {
                    await db.run(
                        'UPDATE users SET github_id = ? WHERE id = ?',
                        [githubId, user.id]
                    );
                }
            }

            // 3. Если вообще нет пользователя — создаём нового
            if (!user) {
                const fakePassword = 'github_' + githubId;

                const result = await db.run(
                    'INSERT INTO users (name, email, password, github_id) VALUES (?, ?, ?, ?)',
                    [
                        name,
                        email || `${profile.username}@github.local`,
                        fakePassword,
                        githubId
                    ]
                );

                user = await db.get(
                    'SELECT * FROM users WHERE id = ?',
                    [result.lastID]
                );
            }

            console.log('GitHub auth successful, user:', user);
            return done(null, user);
        } catch (err) {
            console.error('Error in GitHubStrategy:', err);
            return done(err);
        }
    }
));

// ==================================================
//               CUSTOM AUTH MIDDLEWARE
// ==================================================
// Добавляем кастомные методы аутентификации если passport не добавляет их
app.use((req, res, next) => {
    if (!req.isAuthenticated && passport._userProperty) {
        req.isAuthenticated = function() {
            const property = passport._userProperty || 'user';
            return (this[property]) ? true : false;
        };

        req.isUnauthenticated = function() {
            return !this.isAuthenticated();
        };
    }
    next();
});

// ==================================================
//                  ЛОГИРОВАНИЕ
// ==================================================
app.use((req, res, next) => {
    console.log('=== REQUEST DEBUG ===');
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('isAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : 'method not available');
    console.log('User:', req.user);
    console.log('Session ID:', req.sessionID);
    console.log('=====================');
    next();
});

// ==================================================
//                   МАРШРУТЫ
// ==================================================
app.use('/api', apiRoutes);
app.use('/', webRoutes);

// Тестовый эндпоинт для проверки аутентификации
app.get('/test-auth', (req, res) => {
    res.json({
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : 'method not available',
        user: req.user,
        sessionID: req.sessionID,
        session: req.session
    });
});

// ==================================================
//              ОБРАБОТКА ОШИБОК
// ==================================================
app.use((err, req, res, next) => {
    console.error('Error middleware:', err);
    if (req.path.startsWith('/api')) {
        res.status(500).json({ error: 'Internal Server Error' });
    } else {
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

// 404
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'API route not found' });
    } else {
        res.status(404).send('Страница не найдена');
    }
});

// ==================================================
//                 СТАРТ СЕРВЕРА
// ==================================================
app.listen(3000, () => {
    console.log('🚀 Сервер запущен на порту 3000');
    console.log('📊 API: http://localhost:3000/api');
    console.log('🌐 Веб-интерфейс: http://localhost:3000');
    console.log('🧪 Тест аутентификации: http://localhost:3000/test-auth');
});