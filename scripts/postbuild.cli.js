import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const prefix = '#!/usr/bin/env node';
const file = join('dist', 'cli.js');
const content = readFileSync(file).toString();

writeFileSync(file, `${prefix}\n\n${content}`);
