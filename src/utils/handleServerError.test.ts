import { Response } from 'express';
import handleServerError from './handleServerError';

describe('handleServerError()', () => {
  it('Returns a status code of 500 and sets the type as text', () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const res = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const error = new Error('Test Error');

    handleServerError(res, error);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Test Error'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.type).toHaveBeenCalledWith('text/plain');
    expect(res.send).toHaveBeenCalledWith('Internal Server Error: Test Error');

    consoleLogSpy.mockRestore();
  });
});