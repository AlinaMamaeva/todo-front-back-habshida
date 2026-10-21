import "dotenv/config";

import express from "express";
import cors from "cors";
import http from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";

import connectDB from "./config/database.js";
import todoRoutes from "./routes/todos.js";
import errorHandler from "./middleware/errorHandler.js";
import setupSocket from "./socket/index.js";

const app = express();

// HTTP server
const server = http.createServer(app);

// Connect Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://todo-front-back-habshida.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

// Socket.IO events
setupSocket(io);
app.set("io", io);

app.use(express.json());
app.use(cors());

app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "error",
    database: connected ? "connected" : "disconnected",
  });
});

app.use("/api", todoRoutes);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
