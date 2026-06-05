import { Server } from "socket.io";

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // store connected users
  const connectedClients = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // -------------------------
    // register client
    // -------------------------
    connectedClients.set(socket.id, {
      socket,
      roomId: null,
      userId: null,
      cursor: null,
      lastSeen: Date.now(),
    });

    // -------------------------
    // ROOM JOIN (A4 + A5)
    // -------------------------
    socket.on("ROOM_JOIN", ({ roomId, userId }) => {
      const client = connectedClients.get(socket.id);
      if (!client) return;

      // leave old room
      if (client.roomId) {
        socket.leave(client.roomId);
      }

      client.roomId = roomId;
      client.userId = userId;

      socket.join(roomId);

      // build room users
      const usersInRoom = [...connectedClients.entries()]
        .filter(([_, c]) => c.roomId === roomId)
        .map(([socketId, c]) => ({
          socketId,
          userId: c.userId,
          cursor: c.cursor || null,
        }));

      io.to(roomId).emit("ROOM_USERS_UPDATE", {
        type: "SYNC",
        users: usersInRoom,
      });
    });

    // -------------------------
    // NODE SYNC (A1)
    // -------------------------
    socket.on("NODE_MOVE", (data) => {
      const client = connectedClients.get(socket.id);
      if (!client?.roomId) return;

      client.lastSeen = Date.now();

      socket.to(client.roomId).emit("NODE_MOVED", {
        nodeId: data.nodeId,
        position: data.position,
      });
    });

    // -------------------------
    // EDGE SYNC (A1)
    // -------------------------
    socket.on("EDGE_UPDATE", (data) => {
      const client = connectedClients.get(socket.id);
      if (!client?.roomId) return;

      client.lastSeen = Date.now();

      socket.to(client.roomId).emit("EDGE_UPDATED", {
        edgeId: data.edgeId,
        source: data.source,
        target: data.target,
      });
    });

    // -------------------------
    // CURSOR SYNC (A5)
    // -------------------------
    socket.on("CURSOR_MOVE", ({ x, y }) => {
      const client = connectedClients.get(socket.id);
      if (!client?.roomId) return;

      client.cursor = { x, y };
      client.lastSeen = Date.now();

      socket.to(client.roomId).emit("CURSOR_MOVED", {
        socketId: socket.id,
        x,
        y,
      });
    });

    // -------------------------
    // DISCONNECT (A5 cleanup)
    // -------------------------
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      const client = connectedClients.get(socket.id);

      if (client?.roomId) {
        socket.to(client.roomId).emit("ROOM_USERS_UPDATE", {
          type: "LEAVE",
          socketId: socket.id,
        });
      }

      connectedClients.delete(socket.id);
    });
  });

  return io;
};