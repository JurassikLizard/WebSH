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
    console.log(parsed);
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
        console.log('Client :: ready');
        connections.set(ws, { conn });
        sendMessage(ws, 'Successfully connected to SSH!');
        conn.shell({ rows: parsed.rows, cols: parsed.cols, term: 'xterm-256color' }, (err, stream) => {
            if (err) {
                sendMessage(ws, 'There was a problem with the shell!');
                conn.end();
            }
            stream.on('close', () => {
                console.log('Stream :: close');
                conn.end();
            }).on('data', (data) => {
                console.log(data.toString());
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
