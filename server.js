
console.log('🔥 Server file loaded');
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8082 });
let rooms = new Map();
rooms.set('roomName1', [])
let m = 0;
const express = require('express');
const app = express();
const multer = require('multer');
const path = require('path');
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on 3000');
});
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
},
filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
},
});

const upload = multer({ storage });
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
}

const imageUrl = `http://banlaai.duckdns.org:3000/uploads/${req.file.filename}`;
res.json({ url: imageUrl });
});
app.use('/uploads', express.static('uploads'));

wss.on('connection', (ws) => {
  console.log(new Date(Date.now()) + '✅ Client connected');
  console.log(wss.clients.size)
  ws.send(JSON.stringify({type: "connect"}))
  ws.on('message', (msg) => {
      const  data = JSON.parse(msg)
      if (data.type === 'start') {
        let joined = false;
        for ([id, clients] of rooms) {
            console.log(id)
            if (clients.length === 1) {
                rooms.get(id).push(ws);
                rooms.get(id).forEach((client) => {
                    client.send(JSON.stringify({type: "joined", room: id}))
                })
                joined = true;
                console.log(rooms)
                return;
            }
        }
        if (!joined) { 
            for ([id, clients] of rooms) {
                if (clients.length === 0) {
                    rooms.get(id).push(ws);
                    joined = true;
                    console.log(rooms)
                    return;
                }
            } 
            if (!joined) {
                const id = 'room' + `${m}`;
                rooms.set(id, []);
                rooms.get(id).push(ws);
                m=m+1
                joined = true;
                console.log(rooms)
                return
            }
        }
    }
    if (data.type === 'out') {
        if (!rooms.has(data.roomId)) return;
        for (const client of rooms.get(data.roomId)) {
            client.send(JSON.stringify({type: "leave"}))
        }
        rooms.set(data.roomId, [])
    }
    if (data.type === 'text') {
        if (!rooms.has(data.roomId)) return;
        for (const clientX of rooms.get(data.roomId)) {
            if (clientX !== ws) {
                clientX.send(JSON.stringify({type: "text", content: data.content}))
            }
        }
    }
    if (data.type === 'image') {
        if (!rooms.has(data.roomId)) return;
        for (const clientX of rooms.get(data.roomId)) {
            if (clientX !== ws) {
                clientX.send(JSON.stringify({type: "image", content: data.content}))
            }
        }
    };
})
  ws.on('close', () => {
    for (const [id,room] of rooms) {
        if (room.includes(ws)) {
            for (const clientX of rooms.get(id)) {
                if (clientX !== ws) {
                    clientX.send(JSON.stringify({type: "leave"}))
                }
            }
            console.log(rooms)
            rooms.set(id, [])
        }
    }
    ws.close()
    console.log(wss.clients.size)
    console.log(new Date(Date.now()) + 'client disconect')
})
});
wss.on('error', err => {
    console.error('Server error:', err.message);
});