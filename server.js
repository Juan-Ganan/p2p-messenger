const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 50 * 1024 * 1024 }); // 50MB para imágenes

let users = {};
let generalChatMessages = []; // Historial de sala general

app.use(express.static("public"));

io.on("connection", (socket) => {

    socket.on("join", (username) => {
        users[socket.id] = username;
        io.emit("user-list", users);
    });

    socket.on("join-general", () => {
        socket.join("general");
        io.to("general").emit("user-joined-general", { id: socket.id, name: users[socket.id] });
    });

    socket.on("leave-general", () => {
        socket.leave("general");
        io.to("general").emit("user-left-general", { id: socket.id });
    });

    socket.on("mensaje", (data) => {
        // Mensaje privado
        io.to(data.to).emit("mensaje", {
            from: socket.id,
            user: data.user,
            data: data.data,
            iv: data.iv,
            type: "text"
        });
    });

    socket.on("imagen", (data) => {
        // Imagen privada
        io.to(data.to).emit("imagen", {
            from: socket.id,
            user: data.user,
            image: data.image,
            type: "image"
        });
    });

    socket.on("mensaje-general", (data) => {
        // Mensaje en sala general
        const msg = {
            from: socket.id,
            user: data.user,
            data: data.data,
            iv: data.iv,
            type: "text",
            timestamp: Date.now()
        };
        generalChatMessages.push(msg);
        io.to("general").emit("mensaje-general", msg);
    });

    socket.on("imagen-general", (data) => {
        // Imagen en sala general
        const msg = {
            from: socket.id,
            user: data.user,
            image: data.image,
            type: "image",
            timestamp: Date.now()
        };
        generalChatMessages.push(msg);
        io.to("general").emit("imagen-general", msg);
    });

    socket.on("get-general-history", () => {
        socket.emit("general-history", generalChatMessages);
    });

    socket.on("get-general-history", () => {
        socket.emit("general-history", generalChatMessages);
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
        io.to("general").emit("user-left-general", { id: socket.id });
        delete users[socket.id];
        io.emit("user-list", users);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log("Servidor corriendo en puerto " + PORT);
});