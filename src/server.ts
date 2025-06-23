import { createServer, Server as TcpServer, Socket } from "node:net";
import type { Parser } from "./parser";

export class Server {
    private host: string;
    private port: number;
    private parser: Parser;
    private server: TcpServer;
    private connections: Record<string, Socket>;

    constructor(host: string, port: number, parser: Parser) {
        this.host = host;
        this.port = port;
        this.parser = parser;
        this.server = createServer(this.onConnection.bind(this));
        this.connections = {};
    }

    private onConnection(socket: Socket) {
        const id = crypto.randomUUID();

        const removeListeners = () => {
            socket.off('end', onEnd);
            socket.off('data', onData);
        }

        const onEnd = () => {
            delete this.connections[id];
            removeListeners();
        };

        const onData = (data: Buffer) => {
            this.parser.push(data)
        }

        socket.on('end', onEnd);
        socket.on('data', onData);
    }

    listen() {
        this.server.listen(this.port, this.host);
    }
}