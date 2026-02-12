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

const onlineUsers = new Map();
const userSockets = new Map();
io.on("connection", (socket) => {
    const user = socket.user;

    onlineUsers.set(user.id, {
        id: user.id,
        name: user.name,
        avatar: user.avatar
    });

    userSockets.set(String(user.id), socket.id);

    // danh sách online cho user mới
    socket.emit(
        "presence:list",
        Array.from(onlineUsers.values())
    );

    // user online
    io.emit("presence:online", {
        id: user.id,
        name: user.name,
        avatar: user.avatar
    });

    // user offline
    socket.on("disconnect", () => {
        onlineUsers.delete(user.id);
        userSockets.delete(user.id);
        io.emit("presence:offline", {
            id: user.id
        });
    });
});

// add post
app.post("/post", (req, res) => {
    io.emit("post:new", req.body);
    res.json({ ok: true });
});

// update post
app.post('/post-update', (req, res) => {
    io.emit('post:update', req.body);
    res.json({ ok: true });
});

// xóa post
app.post('/post-delete', (req, res) => {
    io.emit('post:delete', {
        id: req.body.id
    });
    res.sendStatus(200);
});

// reaction
app.post('/post-react', (req, res) => {
    io.emit('post:react', req.body);
    res.json({ ok: true });
});

// comment
app.post('/post-comment', (req, res) => {
    io.emit('post:comment', req.body);
    res.json({ ok: true });
});

// gửi tin nhắn 
app.post("/message-send", (req, res) => {
    const msg = req.body;
    const toSocketId = userSockets.get(String(msg.to_user_id));
    if (toSocketId) {
        io.to(toSocketId).emit("chat:new", msg);
    }
    res.json({ ok: true });
});


server.listen(3000, () => {
    console.log("Socket presence server running :3000");
});
