import { Panel } from "./panel";
import { create, type Transport } from "./transport";
import type { TransportOptions } from "./types";

export type Layout = (number[])[];
interface Options {
    layout: Layout;
    panelWidth: number;
    isMirrored: boolean;
    transport: TransportOptions
}

const PANEL_HEIGHT = 7;

interface ImageData {
    readonly data: Uint8ClampedArray;
	readonly height: number;
	readonly width: number;
}

function getLuminanceRGB(r: number, g: number, b: number): boolean {
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.5 ? false : true;
}

function getPixel(data: ImageData, index: number) {
    const r = data.data[(index * 4) + 0];
    const g = data.data[(index * 4) + 1];
    const b = data.data[(index * 4) + 2];
    const a = data.data[(index * 4) + 3];
    return getLuminanceRGB(r, g, b);
}

export class Display {
    readonly width: number;
    readonly height: number;
    readonly isMirrored: boolean;
    readonly panels: (Panel[])[];
    readonly panelWidth: number;
    readonly transport: Transport;

    constructor(options: Options) {
        this.isMirrored = options.isMirrored;
        this.panels = options.layout.map((row) => {
            return row.map((address) => new Panel(address, options.panelWidth))
        });
        const panelsVertical = options.layout.length;
        const panelsHorizontal = options.layout.map(row => row.length).sort()[0];
        this.panelWidth = options.panelWidth;
        this.height = panelsVertical * PANEL_HEIGHT;
        this.width = panelsHorizontal * options.panelWidth;
        this.transport = create(options.transport);
    }

    setPixel(x: number, y: number, on: boolean) {
        const mirroredX = this.isMirrored ? ((this.width - 1) - x) : x;
        const col = Math.floor(mirroredX / this.panelWidth);
        const row = Math.floor(y / PANEL_HEIGHT);
        const realX = mirroredX % this.panelWidth;
        const realY = this.isMirrored ? (PANEL_HEIGHT - (y % PANEL_HEIGHT)) : (y % PANEL_HEIGHT);
        const panel = this.panels[row][col];
        return panel.setPixel(realX, realY, on);
    }

    getPixel(x: number, y: number): boolean {
        const mirroredX = this.isMirrored ? ((this.width - 1) - x) : x;
        const col = Math.floor(mirroredX / this.panelWidth);
        const row = Math.floor(y / PANEL_HEIGHT);
        const realX = mirroredX % this.panelWidth;
        const realY = this.isMirrored ? (PANEL_HEIGHT - (y % PANEL_HEIGHT)) : (y % PANEL_HEIGHT);
        const panel = this.panels[row][col];
        return panel.getPixel(realX, realY)
    }

    getPanel(address: number): Panel | null {
        for (let i = 0; i < this.panels.length; i += 1) {
            const row = this.panels[i];
            for (let j = 0; j < row.length; j += 1) {
                const p = row[j];
                if (p.address === address) {
                    return p;
                }
            }
        }
        return null;
    }

    private getDirtyPanels(): Panel[] {
        const dirty: Panel[] = [];
        for (const row of this.panels) {
            for (const panel of row) {
                if (panel.dirty) {
                    dirty.push(panel);
                }
            }
        }
        return dirty;
    }

    flush() {
        const dirty = this.getDirtyPanels();
        for (let i = 0; i < dirty.length; i += 1) {
            const last = i >= (dirty.length - 1);
            const panel = dirty[i];
            const command = panel.createCommand(true);
            const sent = this.transport.send(command);
            // Last command sent, mark all dirty panels as not dirty
            if (sent && last) {
                for (const p of dirty) {
                    p.markFlushed();
                }
            }
        }
    }

    setImageData(data: ImageData) {
        for (let x = 0; x < this.width; x += 1) {
            for (let y = 0; y < this.height; y += 1) {
                const pxIndex = (y * this.width) + x;
                const px = getPixel(data, pxIndex);
                this.setPixel(x, y, px);
            }
        }
    }

    isDirty(): boolean {
        for (const row of this.panels) {
            for (const p of row) {
                if (p.dirty) {
                    return true;
                }
            }
        }
        return false;
    }

    connect() {
        this.transport.connect()
            .then(() => {
                console.log('connected to display');
            })
            .catch(() => {
                console.error('Could not connect to display');
                process.exit(1);
            });
    }
}