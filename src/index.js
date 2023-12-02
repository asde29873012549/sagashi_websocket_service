import * as dotenv from "dotenv";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";

dotenv.config();

const { FRONT_END_IP } = process.env;

const cors_option = {
	origin: FRONT_END_IP,
	allowedHeaders: "Content-Type, Authorization",
	credentials: true,
	maxAge: 600,
};

const port = process.env.PORT;
const app = express();
const server = createServer(app);
const io = new Server(server, {
	transports: ["websocket", "polling"],
	cors: {
		origin: [FRONT_END_IP],
		allowedHeaders: ["Authorization", "Content-Type"],
		credentials: true,
	},
	path: "/api/socketio",
	addTrailingSlash: false,
});

app.use(cors(cors_option));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const users = [];
const activeRoom = {};

// Event handler for client connections
io.on("connection", (socket) => {
	const { listingOwner } = socket.handshake.query;
	const { productId } = socket.handshake.query;
	const clientId = socket.handshake.query.user;

	console.log(`Opened Socket connection with chatrooom_id: ${productId}-${listingOwner}-${clientId}`)

	let chatroom_id = new Set();

	if (!users.includes(clientId)) {
		users.push(clientId);
	}

	if (listingOwner !== clientId) {
		chatroom_id.add(`${productId}-${listingOwner}-${clientId}`);
		socket.join(`${productId}-${listingOwner}-${clientId}`);

		if (!activeRoom[productId]) {
			activeRoom[productId] = chatroom_id;
		} else {
			chatroom_id?.forEach((chat_id) => {
				activeRoom[productId].add(chat_id);
			});
		}
	} else {
		chatroom_id = activeRoom[productId];
		activeRoom[productId]?.forEach((chatroom) => {
			socket.join(chatroom);
		});
	}

	io.emit("client-new", Array.from(chatroom_id || []));

	console.log(`client-new emitted. A client connected. ID: ${clientId}-${socket.id}`);

	// Event handler for receiving messages from the client
	socket.on("message", ({ message, client }) => {
		console.log(`Message received: ${message?.text} from ${client}`);

		socket
			.to(`${productId}-${listingOwner}-${client}`)
			.emit("getMessage", { message, sender: clientId });
	});

	// Event handler for client disconnections
	socket.on("disconnect", () => {
		console.log(`Client: ${clientId}-${socket.id} disconnected.`);
	});
});



server.listen(port, () => {
	console.log("websocker server start listening...");
});