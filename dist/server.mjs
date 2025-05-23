"use strict";
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
const dev = process.env.NODE_ENV != "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    const httpServer = createServer(handle);
    const io = new Server(httpServer);
    io.on("connection", (socket) => {
        console.log(`Socket is connected ${socket.id}`);
        socket.on("update_positions", (positions) => {
            socket.broadcast.emit("update_positions", positions);
        });
        socket.on("disconnect", () => {
            console.log(`Socket is disconnected ${socket.id}`);
        });
    });
    httpServer.listen(port, () => {
        console.log(`Server is run: http://${hostname}:${port}`);
    });
});
