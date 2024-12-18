const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static('public'));

// Store connected clients
const clients = new Map();

// Handle WebSocket connections
wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(ws, { 
        id: clientId,
        name: `Guest-${clientId.slice(0, 4)}`  // Default name
    });
    
    console.log(`New client connected with ID: ${clientId}`);

    // Send welcome message with client ID
    ws.send(JSON.stringify({
        type: 'connection',
        clientId: clientId,
        name: clients.get(ws).name,
        message: 'Welcome to WebSocket server!'
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const messageData = JSON.parse(message);
            const client = clients.get(ws);

            if (messageData.type === 'setName') {
                // Update client name
                const oldName = client.name;
                client.name = messageData.name;
                console.log(`Client ${client.id} changed name from ${oldName} to ${client.name}`);
                
                // Broadcast name change
                const nameChangeMessage = JSON.stringify({
                    type: 'system',
                    content: `${oldName} changed their name to ${client.name}`
                });
                
                wss.clients.forEach((c) => {
                    if (c.readyState === WebSocket.OPEN) {
                        c.send(nameChangeMessage);
                    }
                });
            } else {
                // Regular chat message
                console.log(`Received from ${client.name} (${client.id}): ${messageData.content}`);
                
                // Broadcast the message to all connected clients
                const broadcastMessage = JSON.stringify({
                    type: 'message',
                    clientId: client.id,
                    name: client.name,
                    content: messageData.content
                });

                wss.clients.forEach((c) => {
                    if (c.readyState === WebSocket.OPEN) {
                        c.send(broadcastMessage);
                    }
                });
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        const client = clients.get(ws);
        console.log(`Client ${client.name} (${client.id}) disconnected`);
        
        // Broadcast disconnect message
        const disconnectMessage = JSON.stringify({
            type: 'system',
            content: `${client.name} has left the chat`
        });
        
        wss.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) {
                c.send(disconnectMessage);
            }
        });
        
        clients.delete(ws);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
