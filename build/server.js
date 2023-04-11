"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const querystringify_1 = require("querystringify");
const ssh2_1 = require("ssh2");
const wss = new ws_1.WebSocketServer({ port: 80 });
const connections = new Map();
function sendMessage(ws, msg) {
    ws.send('msg|' + msg);
}
wss.on('connection', (ws, req) => {
    if (req.url == null) {
        ws.close();
        return;
    }
    const parsed = (0, querystringify_1.parse)(req.url.split("?")[1]);
    if (parsed.address == null || parsed.username == null || parsed.password == null) {
        ws.close();
        return;
    }
    let address = parsed.address;
    let host = address.split(':')[0];
    let port = 22;
    if (address.split(':').length >= 2) {
        port = Number(address.split(':')[1]);
    }
    const conn = new ssh2_1.Client();
    conn.on('ready', () => {
        connections.set(ws, { conn });
        sendMessage(ws, 'Successfully connected to SSH!');
        console.log(parsed.cols);
        conn.shell({ rows: Number(parsed.rows), cols: Number(parsed.cols) }, (err, stream) => {
            console.log(parsed.rows);
            if (err) {
                sendMessage(ws, 'There was a problem with the shell!');
                conn.end();
            }
            stream.on('close', () => {
                conn.end();
            }).on('data', (data) => {
                ws.send('term|' + data.toString());
            });
            ws.on('message', (data) => {
                let msg = data.toString();
                let prefix = msg.split("|")[0];
                if (prefix == 'cmd') {
                    stream.write(msg.split("|")[1]);
                }
            });
        });
    }).on('error', (err) => {
        sendMessage(ws, 'There was a problem with connecting to the SSH server!');
        ws.close();
    }).connect({
        host: host,
        port: port,
        username: parsed.username,
        password: parsed.password,
        keepaliveCountMax: 3
    });
});
