import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function generateApiKey(): string {
  return `cdy_${uuidv4().replace(/-/g, '')}`;
}
