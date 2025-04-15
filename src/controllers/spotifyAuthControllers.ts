import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import globalState from '../classes/GlobalState.js';
import handleServerError from '../utils/handleServerError.js';
import { CREATE_SPOTIFY_AUTH_URL, GET_SPOTIFY_USER_TOKEN, SPOTIFY_CURRENT_USER_URL } from '../constants.js';
import { TokenReqQuery } from '../RequestInterfaces.js';

export const auth = (req: Request, res: Response) => {
  try {
    const randomStr: string = randomBytes(16).toString('hex');
    const state: string = `${globalState.userId}:${randomStr}`;
    globalState.userIdStateMap.set(globalState.userId++, randomStr);

    res.redirect(302, CREATE_SPOTIFY_AUTH_URL(state));
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

export const token = async (req: TokenReqQuery, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (!globalState.isAuthStateValid(state)) throw new Error('authState did not match state from /spotify/auth');
    if (error) throw new Error(`Status: ${error.status}. Error: ${error.message}`);

    const { access_token, token_type } = await GET_SPOTIFY_USER_TOKEN(code);
    const display_name = await getSpotifyDisplayName(token_type, access_token);

    res.json({
      access_token,
      token_type,
      display_name
    });
  } catch (err) {
    handleServerError(res, err as Error);
  }
}

interface SpotifyCurrentUser {
  display_name: string;
}

async function getSpotifyDisplayName(tokenType: string, accessToken: string): Promise<string> {
  const _currentUserRes = await fetch(SPOTIFY_CURRENT_USER_URL, {
    headers: { 'Authorization': `${tokenType} ${accessToken}`}
  });

  if (!_currentUserRes.ok) {
    const { error } = await _currentUserRes.json();
    throw error;
  }

  const _currentUserData: SpotifyCurrentUser = await _currentUserRes.json();

  return _currentUserData.display_name;
}