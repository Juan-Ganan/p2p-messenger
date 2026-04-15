const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let users = {};

app.use(express.static("public"));

io.on("connection", (socket) => {

    socket.on("join", (username) => {
        users[socket.id] = username;
        io.emit("user-list", users);
    });

    socket.on("mensaje", (data) => {
    io.to(data.to).emit("mensaje", {
        from: socket.id,
        user: data.user,
        data: data.data,
        iv: data.iv
    });
});

    socket.on("public-key", (data) => {
        io.to(data.to).emit("public-key", {
            from: socket.id,
            key: data.key
        });
    });

    socket.on("offer", (data) => {
        io.to(data.to).emit("offer", {
            from: socket.id,
            offer: data.offer
        });
    });

    socket.on("answer", (data) => {
        io.to(data.to).emit("answer", {
            from: socket.id,
            answer: data.answer
        });
    });

    socket.on("ice-candidate", (data) => {
        io.to(data.to).emit("ice-candidate", {
            from: socket.id,
            candidate: data.candidate
        });
    });

    socket.on("disconnect", () => {
        delete users[socket.id];
        io.emit("user-list", users);
    });
});

server.listen(3000, "0.0.0.0", () => {
    console.log("Servidor listo");
});