/**
 * server.js
 *
 * A Node.js server that serves static files from the "public" folder
 * and handles WebSocket connections for a real-time chat.
 */
const path = require("path");
const favicon = require("serve-favicon");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

console.log("Starting chat application...");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Use favicon from "public/favicon.ico"
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

// Serve static files (like index.html, CSS, client-side JS) from "public"
app.use(express.static("public"));
console.log("Static file serving middleware set up.");

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("New WebSocket connection established.");

  // Handle incoming messages from a client
  ws.on("message", (message) => {
    // Log on the server
    console.log("Received from client:", message);

    // Broadcast this message to all other connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // (Optional) Log socket closure
  ws.on("close", () => {
    console.log("WebSocket connection closed.");
  });
});

// Error handling for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

// Error handling for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Start the server
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

console.log("Server setup complete, waiting for connections...");
