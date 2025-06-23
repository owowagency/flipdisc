export class Panel {
    readonly address: number;
    readonly columns: Uint8Array;
    readonly command: Uint8Array;
    dirty: boolean;

    constructor(address: number, width: number) {
        this.address = address;
        this.columns = new Uint8Array(width);
        this.columns.fill(0);
        // COMMAND ID - FLUSH/BUFFER - ADDRESS - DATA - END BYE
        this.command = new Uint8Array(1 + 1 + 1 + width + 1);
        this.dirty = true;
    }

    createCommand(flush: boolean) {
        this.command[0] = 0x80;
        this.command[1] = flush ? 0x83 : 0x84;
        this.command[2] = this.address;
        const imageDataOffset = 3;
        const endByteOffset = imageDataOffset + this.columns.length;
        for (let i = 0; i < this.columns.length; i += 1) {
            this.command[i + imageDataOffset] = this.columns[i];
        }
        this.command[endByteOffset] = 0x8F;
        return this.command;
    }

    getPixel(x: number, y: number): boolean {
        const col = this.columns[x];
        const mask = 1 << (y - 1);
        return (col & mask) != 0
    }

    setPixel(x: number, y: number, on: boolean) {
        let col = this.columns[x];
        const mask = 1 << (y - 1);
        if (on) {
            col |= mask;
        } else {
            col &= ~mask;
        }
        if (this.columns[x] !== col) {
            this.dirty = true;
        }
        this.columns[x] = col;
    }

    putColumn(index: number, data: number) {
        if (this.columns[index] !== data) {
            this.dirty = true;
        }
        this.columns[index] = data;
    }

    markFlushed() {
        this.dirty = false;
    }    
}