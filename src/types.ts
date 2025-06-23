export interface TcpTransportOptions {
    type: 'ip',
    host: string;
    port: number;
}

export interface SerialTransportOptions {
    type: 'serial',
    path: string;
    baudRate: number;
}

export interface StdoutTransportOptions {
    type: 'stdout',
}

export interface NoopTransportOptions {
    type: 'noop',
}

export type TransportOptions = TcpTransportOptions | SerialTransportOptions | StdoutTransportOptions | NoopTransportOptions;
