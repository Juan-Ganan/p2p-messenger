const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 50 * 1024 * 1024, cors: { origin: "*" } });

let users = {};
let generalChatMessages = [];
let connectedNodes = {}; // Otros nodos/servidores conectados
let nodeInfo = null; // Información sobre este nodo

app.use(express.static("public"));

// Obtener IP local
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

io.on("connection", (socket) => {

  socket.on("join", (username) => {
    users[socket.id] = username;
    io.emit("user-list", users);
    // Propagar usuarios a otros nodos
    for (let nodeId in connectedNodes) {
      connectedNodes[nodeId].emit("user-list", users);
    }
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
    io.to(data.to).emit("mensaje", {
      from: socket.id,
      user: data.user,
      data: data.data,
      iv: data.iv,
      type: "text"
    });
  });

  socket.on("imagen", (data) => {
    io.to(data.to).emit("imagen", {
      from: socket.id,
      user: data.user,
      image: data.image,
      type: "image"
    });
  });

  socket.on("mensaje-general", (data) => {
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
    // Propagar a otros nodos
    for (let nodeId in connectedNodes) {
      connectedNodes[nodeId].emit("mensaje-general", msg);
    }
  });

  socket.on("imagen-general", (data) => {
    const msg = {
      from: socket.id,
      user: data.user,
      image: data.image,
      type: "image",
      timestamp: Date.now()
    };
    generalChatMessages.push(msg);
    io.to("general").emit("imagen-general", msg);
    // Propagar a otros nodos
    for (let nodeId in connectedNodes) {
      connectedNodes[nodeId].emit("imagen-general", msg);
    }
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

  // P2P: Cuando un nodo se conecta
  socket.on("node-join", (nodeData) => {
    console.log("Nodo unido:", nodeData);
    connectedNodes[socket.id] = socket;
    io.emit("node-list", { nodes: Object.keys(connectedNodes).map(id => connectedNodes[id]) });
  });

  socket.on("disconnect", () => {
    io.to("general").emit("user-left-general", { id: socket.id });
    delete users[socket.id];
    delete connectedNodes[socket.id];
    io.emit("user-list", users);
  });
});

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
const LOCAL_IP = getLocalIP();

server.listen(PORT, HOST, () => {
  nodeInfo = { ip: LOCAL_IP, port: PORT, url: `http://${LOCAL_IP}:${PORT}` };
  console.log(`🌐 Servidor P2P corriendo en ${nodeInfo.url}`);
  console.log(`💾 Este nodo comparte datos con otros nodos en la red`);
});