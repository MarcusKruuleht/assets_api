const express = require('express')
const app = express()
const swaggerUi = require('swagger-ui-express');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config()

YAML = require('yamljs');
const swaggerDocument = YAML.load('swagger.yml');
const prisma = new PrismaClient()

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static(__dirname + '/public'));
app.use(express.json())


app.post('/users', async (req, res) => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    try {
        checkParams(req, res, [{ name: 'email', type: 'string', regex: emailRegex }, { name: 'password', type: 'string', minLength: 3 }, { name: 'name', type: 'string', minLength: 3 }])
        const user = await prisma.user.create({
            data: {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password
            }
        });
        res.status(201).send(user)
    } catch (e) {
        res.status(e.statusCode || 500).send({ error: e.message })
    }
});

app.listen(process.env.PORT, () => {
    console.log(`App running at http://localhost:${process.env.PORT}. Documentation at http://localhost:${process.env.PORT}/docs`)
})

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit();
});

app.post('/sessions', async (req, res) => {

    if (!req.body.username || !req.body.password) {
        return res.status(400).send({ error: 'One or all params are missing' })
    }

    //const user = users.find((user) => user.username === req.body.username && user.password === req.body.password);

    const user = await prisma.user.findUnique({
        where: {
            username: req.body.username,
            password: req.body.password
        },
    })

    if (!user) {
        return res.status(401).send({ error: 'Unauthorized: username or password is incorrect' })
    }

    const sessionId = Math.floor(Math.random() * 1000000000);

    let newSession = {
        id: sessionId,
        userId: user.id
    }

    sessions.push(newSession)
    res.status(201).send(
        { sessionId, isAdmin: user.isAdmin }
    )
})

app.delete('/sessions', requireAuth, (req, res) => {

    sessions = sessions.filter((session) => session.id !== req.sessionId);
    res.status(204).end()

})

app.use(function (err, req, res, next) {

    console.error(err.stack)

    if (!err.statusCode) {
        err.statusCode = 500;
    }

    return res.status(err.statusCode).json({ error: (err.message) });
})

function requireAuth(req, res, next) {
    // Check if the user is authenticated
    if (!req.headers.authorization) {
        return res.status(401).send({ error: 'Unauthorized: no authorization header' })
    }

    const bearerToken = parseInt(req.headers.authorization.split(' ')[1]);
    const session = sessions.find((session) => session.id === bearerToken);

    if (!session) {
        return res.status(401).send({ error: 'Unauthorized: session is invalid' })
    }

    const user = users.find((user) => user.id === session.userId);

    if (!user) {
        return res.status(401).send({ error: 'Unauthorized: user is invalid' })
    }

    req.user = user;
    req.sessionId = session.id;

    next()
}

function checkParams(req, res, params) {
    params.forEach(param => {
        if (!req.body[param.name]) {
            throw createError(`Parameter ${param.name} is missing`, 400)
        }
        if (param.type === 'string') {
            if (param.minLength && req.body[param.name].length < param.minLength) {
                throw createError(`Parameter ${param.name} is too short`, 400)
            }
            if (param.regex && !param.regex.test(req.body[param.name])) {
                throw createError(`Parameter ${param.name} fails to match the required pattern ${param.regex}`, 400)
            }
        }
    })
}

function createError(message, status) {
    const error = new Error(message);
    error.statusCode = status;
    return error;
}


