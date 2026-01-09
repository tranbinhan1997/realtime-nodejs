const express = require("express");
const http = require("http");
const axios = require("axios");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json()); 

const io = require("socket.io")(server, {
    cors: { origin: "*" }
});

const onlineUsers = new Map();

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        const res = await axios.get(
            "http://127.0.0.1:8000/api/auth/me",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        socket.user = res.data;
        next();
    } catch (err) {
        next(new Error("Unauthorized"));
    }
});

io.on("connection", (socket) => {
    const user = socket.user;

    onlineUsers.set(user.id, {
        id: user.id,
        name: user.name
    });

    // danh sách online cho user mới
    socket.emit(
        "presence:list",
        Array.from(onlineUsers.values())
    );

    // user online
    io.emit("presence:online", {
        id: user.id,
        name: user.name
    });

    // user offline
    socket.on("disconnect", () => {
        onlineUsers.delete(user.id);
        io.emit("presence:offline", {
            id: user.id
        });
    });
});

app.post("/post", (req, res) => {
    io.emit("post:new", req.body);
    res.json({ ok: true });
});

app.post('/post-delete', (req, res) => {
    io.emit('post:delete', {
        id: req.body.id
    });
    res.sendStatus(200);
});

server.listen(3000, () => {
    console.log("Socket presence server running :3000");
});
