/**
 * AI Training Utilities
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensure directory exists
 */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write JSONL file
 */
export function writeJsonlFile(filePath: string, records: any[]): void {
  ensureDir(path.dirname(filePath));
  const lines = records.map((r) => JSON.stringify(r));
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Split array into train/val sets
 */
export function splitTrainVal<T>(array: T[], trainRatio: number = 0.9): { train: T[]; val: T[] } {
  const shuffled = shuffleArray(array);
  const splitIndex = Math.floor(shuffled.length * trainRatio);
  return {
    train: shuffled.slice(0, splitIndex),
    val: shuffled.slice(splitIndex),
  };
}
