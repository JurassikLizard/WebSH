import WebSocket, { WebSocketServer } from 'ws'
import { parse } from 'querystringify'
import { Client, ShellOptions } from 'ssh2'

const wss = new WebSocketServer({ port: 80 });
const connections = new Map();

function sendMessage(ws: WebSocket.WebSocket, msg: string) {
    ws.send('msg|' + msg)
}

interface SSHInfo {
    username: string,
    password: string,
    address: string,
    rows: string,
    cols: string
}


wss.on('connection', (ws, req) => {
    if(req.url == null) {
        ws.close()
        return
    }
    const parsed = (parse(req.url.split("?")[1]) as SSHInfo)
    
    if(parsed.address == null || parsed.username == null || parsed.password == null) {
        ws.close()
        return
    }

    let address: string = (parsed.address as string)
    let host = address.split(':')[0]
    let port = 22
    if(address.split(':').length >= 2) {
        port = Number(address.split(':')[1])
    }

    const conn = new Client();
    conn.on('ready', () => {
        connections.set(ws, { conn })
        sendMessage(ws, 'Successfully connected to SSH!')
        
        conn.shell({ rows: Number(parsed.rows), cols: Number(parsed.cols) } as ShellOptions, (err, stream) => {
            if (err) {
                sendMessage(ws, 'There was a problem with the shell!')
                conn.end()
            }

            stream.on('close', () => {
              conn.end();
            }).on('data', (data: string) => {
              ws.send('term|' + data.toString())
            })

            ws.on('message', (data) => {
                let msg: string = data.toString()
                let prefix = msg.split("|")[0]
                if(prefix == 'cmd') {
                    stream.write(msg.split("|")[1])
                }
            })
        });
    }).on('error', (err) => { 
        sendMessage(ws, 'There was a problem with connecting to the SSH server!')
        ws.close()
    }).connect({
        host: host,
        port: port,
        username: (parsed.username as string),
        password: (parsed.password as string),
        keepaliveCountMax: 3
    })
})