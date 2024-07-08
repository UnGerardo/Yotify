
class GlobalState {
  #spotifyToken = '';
  #spotifyTokenType = '';
  #spotifyTokenExpiry = 0;

  #userIdStateMap = new Map();
  #userId = 0;

  #playlistSnapshots = new Map();

  constructor() {
    if (!GlobalState.instance) {
      GlobalState.instance = this;
    }
    return GlobalState.instance;
  }

  get spotifyToken() { return this.#spotifyToken; }
  set spotifyToken(token) { this.#spotifyToken = token; }

  get spotifyTokenType() { return this.#spotifyTokenType; }
  set spotifyTokenType(type) { this.#spotifyTokenType = type; }

  get spotifyTokenExpiry() { return this.#spotifyTokenExpiry; }
  set spotifyTokenExpiry(time) { this.#spotifyTokenExpiry = time; }

  getUserIdStateMap(key) { return this.#userIdStateMap.get(key.toString()); }
  setUserIdStateMap(key, val) { this.#userIdStateMap.set(key.toString(), val); }
  deleteUserIdStateMap(key) { this.#userIdStateMap.delete(key.toString()); }

  get userId() { return this.#userId; }
  incrementUserId() { this.#userId++; }

  getPlaylistSnapshot(key) { return this.#playlistSnapshots.get(key.toString()); }
  setPlaylistSnapshot(key, val) { this.#playlistSnapshots.set(key.toString(), val); }
  deletePlaylistSnapshot(key) { this.#playlistSnapshots.delete(key.toString()); }
}

const INSTANCE = new GlobalState();
Object.freeze(INSTANCE);

module.exports = INSTANCE;