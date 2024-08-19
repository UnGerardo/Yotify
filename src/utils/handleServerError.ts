import { Response } from 'express';

export default function handleServerError(res: Response, err: Error): void {
  console.log(`${err.stack}`);
  res.status(500).type('text/plain').send(`Internal Server Error: ${err.message}`);
}