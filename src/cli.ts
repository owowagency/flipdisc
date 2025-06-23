import { TerminalRenderer } from "./renderer";
import { Display, type Layout } from "./display";
import { Parser } from "./parser";
import { Server } from "./server";
import { readFileSync } from "node:fs";

interface CliConfig {
    host: string;
    port: number;
    layout: Layout;
    panelWidth: number;
    isMirrored: boolean;
}

const defaultConfig: CliConfig = {
    host: '127.0.0.1',
    port: 3000,
    layout: [
        [3, 2, 1],
        [4, 5, 6],
        [9, 8, 7],
        [10, 11, 12],
    ],
    panelWidth: 28,
    isMirrored: true,
}

function isLayout(value: any): value is Layout {
    if (!Array.isArray(value)) {
        return false;
    }

    if (value.length <= 0) {
        return false;
    }

    for (const row of value) {
        if (!Array.isArray(row)) {
            return false;
        }

        if (row.length <= 0) {
            return false;
        }

        for (const item of row) {
            if (typeof item !== 'number') {
                return false;
            }
        }
    }

    return true;
}

function validateConfig(config: any): Partial<CliConfig> {
    const parsed: Partial<CliConfig> = {};

    if ('layout' in config) {
        if (isLayout(config.layout)) {
            parsed.layout = config.layout;
        } else {
            console.warn('Invalid "layout" in config file');
        }
    }

    if ('isMirrored' in config) {
        if (typeof config.isMirrored === 'boolean') {
            parsed.isMirrored = config.isMirrored;
        } else {
            console.warn('Invalid "isMirrored" in config file');
        }
    }

    if ('panelWidth' in config) {
        if (typeof config.panelWidth === 'number') {
            parsed.panelWidth = config.panelWidth;
        } else {
            console.warn('Invalid "panelWidth" in config file');
        }
    }

    if ('port' in config) {
        if (typeof config.port === 'number') {
            parsed.port = config.port;
        } else {
            console.warn('Invalid "port" in config file');
        }
    }

    if ('host' in config) {
        if (typeof config.host === 'string') {
            parsed.host = config.host;
        } else {
            console.warn('Invalid "host" in config file');
        }
    }

    return parsed;
}

function parseConfig(): Partial<CliConfig> {
    const pattern = /(-c|--config)=(?<config>.+)/;
    const match = process.argv.map((arg) => arg.trim().match(pattern)).find(m => !!m);

    if (match) {
        const file = match.groups['config'];
        const json = JSON.parse(readFileSync(file).toString('utf-8'));
        return validateConfig(json);
    }

    return {};
}

function parsePort(): number | undefined {
    const pattern = /(-p|--port)=(?<port>\d+)/;
    const match = process.argv.map((arg) => arg.trim().match(pattern)).find(m => !!m);
    if (match) {
        return Number.parseInt(match.groups['port'])
    }

    return undefined;
}

function parseHost(): string | undefined {
    const pattern = /(-h|--host)=(?<host>.+)/;
    const match = process.argv.map((arg) => arg.trim().match(pattern)).find(m => !!m);
    if (match) {
        return match.groups['host'];
    }

    return undefined;
}

const config = parseConfig();
const port = parsePort() ?? config.port ?? defaultConfig.port;
const host = parseHost() ?? config.host ?? defaultConfig.host;

const display = new Display({
    layout: config.layout ?? defaultConfig.layout,
    panelWidth: config.panelWidth ?? defaultConfig.panelWidth,
    isMirrored: typeof config.isMirrored ? config.isMirrored : defaultConfig.isMirrored,
    transport: {
        type: 'noop'
    }
})

const pixels = new Uint8Array(display.width * display.height);
const renderer = new TerminalRenderer(display.width, display.height);

function render() {
    for (let x = 0; x < display.width; x += 1) {
        for (let y = 0; y < display.height; y += 1) {
            const px = display.getPixel(x, y);
            const index = (y * display.width) + x;
            pixels[index] = px ? 1 : 0;
        }
    }
    renderer.render(pixels);
}

const parser = new Parser(display, render);
const server = new Server(host, port, parser);

server.listen();
renderer.start();