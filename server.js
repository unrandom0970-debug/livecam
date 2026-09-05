const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

io.on("connection", (socket) => {

    console.log("🟢 Usuario conectado:", socket.id);

    socket.on("join-room", (roomId) => {

        if (!roomId) return;

        const room = rooms.get(roomId) || new Set();

        if (room.size >= 2) {
            socket.emit("room-full");
            return;
        }

        room.add(socket.id);
        rooms.set(roomId, room);

        socket.join(roomId);
        socket.roomId = roomId;

        console.log(`👥 ${socket.id} entró a ${roomId}`);

        socket.emit("joined-room", {
            roomId,
            users: room.size
        });

        socket.to(roomId).emit("user-joined", {
            socketId: socket.id
        });
    });


    // 📡 WEBRTC: OFERTA

    socket.on("offer", (data) => {

        socket.to(data.to).emit("offer", {
            offer: data.offer,
            from: socket.id
        });

    });


    // 📡 WEBRTC: RESPUESTA

    socket.on("answer", (data) => {

        socket.to(data.to).emit("answer", {
            answer: data.answer,
            from: socket.id
        });

    });


    // 📡 WEBRTC: ICE

    socket.on("ice-candidate", (data) => {

        socket.to(data.to).emit("ice-candidate", {
            candidate: data.candidate,
            from: socket.id
        });

    });


    // 🔴 DESCONECTAR

    socket.on("disconnect", () => {

        const roomId = socket.roomId;

        if (roomId && rooms.has(roomId)) {

            const room = rooms.get(roomId);

            room.delete(socket.id);

            socket.to(roomId).emit("user-left", {
                socketId: socket.id
            });

            if (room.size === 0) {
                rooms.delete(roomId);
            }
        }

        console.log("🔴 Usuario desconectado:", socket.id);

    });

});

server.listen(PORT, () => {

    console.log(
        `🚀 LiveCam funcionando en http://localhost:${PORT}`
    );

});
