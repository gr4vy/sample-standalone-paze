import fs from 'fs';
import path from 'path';
import { Gr4vy, withToken } from '@gr4vy/sdk';
import config from '../config.js';

const keyPath = path.join(process.cwd(), 'private_key.pem');

export { config };
export const privateKey = fs.readFileSync(keyPath, 'utf8');

const defaultBaseUrl =
  config.server === 'production'
    ? `https://api.${config.id}.gr4vy.app`
    : `https://api.sandbox.${config.id}.gr4vy.app`;

export const apiBase = config.apiBaseUrl || defaultBaseUrl;

export const gr4vy = new Gr4vy({
  id: config.id,
  server: config.server,
  serverURL: apiBase,
  bearerAuth: withToken({ privateKey }),
});
