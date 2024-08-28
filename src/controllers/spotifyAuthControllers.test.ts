import app, { listener } from '../server';
import request from 'supertest';

describe('SpotifyAuthControllers', () => {
  it('Redirects to the correct url', async () => {
    const _res = await request(app)
      .get('/spotify/auth')
      .redirects(0)
      .expect(302)
      .expect('Location', /https:\/\/accounts.spotify.com\/authorize?/);
  });
});

afterAll(() => {
  listener.close();
  listener.closeAllConnections();
});