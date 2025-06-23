import { Socket } from "node:net";
import {SerialPort} from "serialport";
import type { SerialTransportOptions, TcpTransportOptions, TransportOptions } from "./types";


export interface Transport {
    send(data: Uint8Array): boolean;
    connect(): Promise<void>
}

export function create(options: TransportOptions): Transport {
    switch (options.type) {
        case 'ip': return new TcpTransport(options);
        case 'stdout': return new StdoutTransport(true);
        case 'noop': return new StdoutTransport(false);
        case 'serial': return new SerialPortTransport(options); // TOOD
    }
}

class StdoutTransport implements Transport {
    private readonly enabled: boolean;

    constructor(enabled: boolean) {
        this.enabled = enabled;
    }

    send(data: Uint8Array): boolean {
        if (this.enabled) {
            const message = [...data.values()].map(b => b.toString(16).padStart(2, '0')).join(' ')
            process.stdout.write(message);
            process.stdout.write('\n');
        }

        return true;
    }

    connect(): Promise<void> {
        return Promise.resolve();
    }
}

class SerialPortTransport implements Transport {
    private readonly port: SerialPort;
    private reallyOpen: boolean = false;


    constructor(options: SerialTransportOptions) {
        this.port = new SerialPort({
            path: options.path,
            baudRate: options.baudRate
        }, (err) => {
            if (!err) {
                this.reallyOpen = true;
            }
        });
    }

    send(data: Uint8Array): boolean {
        if (this.reallyOpen) {
            this.port.write(data);
            return true;
        }

        return false;
    }

    connect(): Promise<void> {
        return Promise.resolve();
    }
}

class TcpTransport implements Transport {
    private readonly socket: Socket;
    private readonly host: string;
    private readonly port: number;

    constructor(options: TcpTransportOptions) {
        this.socket = new Socket();
        this.host = options.host;
        this.port = options.port;
    }

    send(data: Uint8Array): boolean {
        if (this.socket.readyState === 'open') {
            this.socket.write(data);
            return true;
        }

        return false;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.once('connect', () => {
                resolve();
            })
            this.socket.once('connectionAttemptFailed', () => {
                reject();
            });
            this.socket.connect(this.port, this.host);
        });
    }
}