import {emitKeypressEvents} from 'node:readline';

class TerminalOut {
    private buffer = '';
    flush() {
        process.stdout.write(this.buffer);
        this.buffer = '';
    }

    moveCursor(x: number, y: number) {
        this.buffer += `\x1B[${y};${x}H`;
    }

    clear() {
        this.buffer += '\x1Bc';
    }

    hideCursor() {
        this.buffer += '\x1B[?25l';
    }

    showCursor() {
        this.buffer += '\x1B[?25h';
    }

    write(value: string) {
        this.buffer += value;
    }
}

export class TerminalRenderer {
    width: number;
    height: number;
    private out: TerminalOut;
    private previous: Uint8Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.out = new TerminalOut();
        this.previous = new Uint8Array(this.width * this.height);
    }

    getLuminanceRGB(r: number, g: number, b: number): 0 | 1 {
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return luminance < 0.5 ? 0 : 1;
    }

    private getPixel(data: ImageData, index: number) {
        const r = data.data[(index * 4) + 0];
        const g = data.data[(index * 4) + 1];
        const b = data.data[(index * 4) + 2];
        const a = data.data[(index * 4) + 3];
        return this.getLuminanceRGB(r, g, b);
    }

    render(pixels: Uint8Array) {
        for (let x = 0; x < this.width; x += 1) {
            for (let y = 0; y < this.height / 2; y += 1) {
                const realY = y * 2;
                const topIndex = (realY * this.width) + x;
                const bottomIndex = ((realY + 1) * this.width) + x;
                const topPx = pixels[topIndex];
                const bottomPx = pixels[bottomIndex];
                const dirty = this.previous[topIndex] !== topPx || this.previous[bottomIndex] !== bottomPx;
                if (dirty) {
                    this.write(x, y, topPx === 1, bottomPx === 1);
                    this.previous[topIndex] = topPx;
                    this.previous[bottomIndex] = bottomPx;
                }
            }
        }
        this.out.flush();
    }

    private write(x: number, y: number, top: boolean, bottom: boolean) {
        this.out.moveCursor(x + 1, y + 1);
        const bg = top ? 47 : 40;
        const fg = bottom ? 37 : 30;
        this.out.write(`\x1b[0;${bg};${fg}m▄`)
    }

    private fill() {
        for (let x = 0; x < this.width; x += 1) {
            for (let y = 0; y < this.height / 2; y += 1) {
                this.write(x, y, false, false);
            }
        }
        this.out.flush();
    }

    start() {
        const onExit = () => {
            this.out.clear();
            this.out.showCursor();
            this.out.flush();
            process.stdin.setRawMode(false);
            process.exit(0);
        }
        this.out.clear();
        this.out.hideCursor();
        this.out.flush();
        emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on("keypress", (chunk, key) => {
            if(key && key.name === "c" && key.ctrl) {
                onExit();
            }
        });
        this.fill();
        process.on('SIGINT', onExit);
    }
}
