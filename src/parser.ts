import type { Display } from "./display";
import type { Panel } from "./panel";

export class Parser {
    state: 'idle' | 'command' = 'idle';
    flush: 'flush' | 'buffer' | 'unknown' = 'unknown';
    panel: Panel | null = null;
    column: number = 0;
    private readonly onFlush: () => void;
    private readonly display: Display;

    constructor(display: Display, onFlush: () => void) {
        this.display = display;
        this.onFlush = onFlush;
    }

    push(data: Buffer) {
        //  const message = [...data.values()].map(b => b.toString(16).padStart(2, '0')).join(' ');
        //  console.log(message);
        for (let index = 0; index < data.length; index += 1) {
            const byte = data[index];
            if (this.state === 'idle') {
                if (byte === 0x80) {
                    this.state = 'command';
                } else {
                    throw new Error('Did not expect this');
                }
                continue;
            }

            if (this.flush === 'unknown') {
                if (byte === 0x83) {
                    this.flush = 'flush';
                } else if (byte === 0x84) {
                    this.flush = 'buffer';
                } else {
                    throw new Error('Did not expect this');
                }
                continue
            }

            if (this.panel === null) {
                this.panel = this.display.getPanel(byte);
                if (this.panel === null) {
                    throw new Error('Could not find panel');
                }
                this.column = 0;
                continue
            }

            if (byte === 0x8F) {
                if (this.flush === 'flush') {
                    this.onFlush();
                }
                this.state = 'idle';
                this.panel = null;
                this.flush = 'unknown';
                continue;
            }

            this.panel.putColumn(this.column, byte);
            this.column += 1;
        }
    }
}