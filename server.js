
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

const rooms = new Map();

io.on("connection", socket => {
  socket.on("createRoom", name => {
    let code;
    do {
      code = String(Math.floor(Math.random() * 9999) + 1);
    } while (rooms.has(code));

    rooms.set(code, new Map());
    joinRoom(code, name);
    socket.emit("roomCreated", code);
  });

  socket.on("joinRoom", ({ code, name }) => {
    joinRoom(String(code), name);
  });

  function joinRoom(code, name) {
    const room = rooms.get(code);

    if (!room) {
      socket.emit("errorMessage", "Өрөө олдсонгүй");
      return;
    }

    if (room.size >= 100) {
      socket.emit("errorMessage", "Өрөө дүүрсэн байна");
      return;
    }

    socket.join(code);
    socket.data.room = code;

    room.set(socket.id, {
      id: socket.id,
      name: String(name || "Player").slice(0, 20),
      x: 0,
      z: 0,
      rotation: 0,
      hp: 100
    });

    socket.emit("joinedRoom", code);
    io.to(code).emit("players", [...room.values()]);
  }

  socket.on("tankMove", data => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room || !room.has(socket.id)) return;

    const player = room.get(socket.id);

    player.x = Math.max(-100, Math.min(100, Number(data.x) || 0));
    player.z = Math.max(-100, Math.min(100, Number(data.z) || 0));
    player.rotation = Number(data.rotation) || 0;

    socket.to(code).emit("tankUpdated", player);
  });

  socket.on("disconnect", () => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;

    room.delete(socket.id);

    if (room.size === 0) rooms.delete(code);
    else io.to(code).emit("players", [...room.values()]);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Challenger 2 server started");
});
