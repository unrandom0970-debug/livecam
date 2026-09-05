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

        // Si el usuario ya estaba en otra sala, lo sacamos primero
        if (socket.roomId) {
            socket.leave(socket.roomId);
        }

        const room = rooms.get(roomId) || new Set();

        // Máximo 2 personas por llamada
        if (room.size >= 2) {
            socket.emit("room-full");
            return;
        }

        room.add(socket.id);
        rooms.set(roomId, room);

        socket.join(roomId);
        socket.roomId = roomId;

        console.log(`👥 ${socket.id} entró a la sala ${roomId}`);

        socket.emit("joined-room", {
            roomId,
            users: room.size
        });

        socket.to(roomId).emit("user-joined", {
            socketId: socket.id
        });
    });

    // WebRTC: oferta
    socket.on("offer", (data) => {
        if (!data || !data.to || !data.offer) return;

        socket.to(data.to).emit("offer", {
            offer: data.offer,
            from: socket.id
        });
    });

    // WebRTC: respuesta
    socket.on("answer", (data) => {
        if (!data || !data.to || !data.answer) return;

        socket.to(data.to).emit("answer", {
            answer: data.answer,
            from: socket.id
        });
    });

    // WebRTC: candidatos ICE
    socket.on("ice-candidate", (data) => {
        if (!data || !data.to || !data.candidate) return;

        socket.to(data.to).emit("ice-candidate", {
            candidate: data.candidate,
            from: socket.id
        });
    });

    // Desconexión
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

// IMPORTANTE PARA CLOUD
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 LiveCam funcionando en puerto ${PORT}`);
});
