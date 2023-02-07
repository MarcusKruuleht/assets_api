const express = require('express')
const app = express()
const swaggerUi = require('swagger-ui-express');
require('dotenv').config()

YAML = require('yamljs');
const swaggerDocument = YAML.load('swagger.yml');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static(__dirname + '/public'));
app.use(express.json())

app.listen(process.env.PORT, () => {
    console.log(`App running at http://localhost:${process.env.PORT}. Documentation at http://localhost:${process.env.PORT}/docs`)
})

const users = [
    { id: 1, username: "marcus", password: "qwerty", isAdmin: true },
    { id: 2, username: "User", password: "Password", isAdmin: false }
]

let sessions = [
    { id: 174089643, userId: 1 }
]

app.post('/sessions', (req, res) => {
    
    if (!req.body.username || !req.body.password) {
        return res.status(400).send({ error: 'One or all params are missing' })
    }
    
    const user = users.find((user) => user.username === req.body.username && user.password === req.body.password);
    
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