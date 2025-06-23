# Flipdot Emulator

## Start flipdot emulator

```
flipdot-emu --port=3000 --host=0.0.0.0
```

## Use flipdot in app

```ts
import { Display } from '@owowagency/flipdot-emu';
import { createCanvas } from "canvas";

const display = new Display({
    layout: [
        [3, 2, 1],
        [4, 5, 6],
        [9, 8, 7],
        [10, 11, 12],
    ],
    isMirrored: true,
    panelWidth: 28,
    transport: {
        type: 'serial',
        path: '/dev/ttyACM0',
        baudRate: 57600,
    },
});
const canvas = createCanvas(display.width, display.height);
const ctx = canvas.getContext('2d');
display.connect();

// Render to canvas
ctx.fillStyle = '#fff';
ctx.fillRect(10, 10, 10, 10);

// Update the display pixels
const data = ctx.getImageData(0, 0, display.width, display.height);
display.setImageData(data);

// Check of any of the panels in the display are marked as "dirty"
if (display.isDirty()) {
    // Flushes "dirty" panel pixel data to the actual display
    display.flush();
}

```