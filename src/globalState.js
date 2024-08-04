
class GlobalState {
  #spotifyToken = '';
  #spotifyTokenType = '';
  #spotifyTokenExpiry = 0;

  #userIdStateMap = new Map();
  #userId = 0;

  #spotdlSnapshots = new Map();
  #zotifySnapshots = new Map();

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

  getUserIdStateMap(playlistId) { return this.#userIdStateMap.get(playlistId.toString()); }
  setUserIdStateMap(playlistId, snapshotId) { this.#userIdStateMap.set(playlistId.toString(), snapshotId); }
  deleteUserIdStateMap(playlistId) { this.#userIdStateMap.delete(playlistId.toString()); }

  get userId() { return this.#userId; }
  incrementUserId() { this.#userId++; }

  getSpotdlSnapshot(playlistId) { return this.#spotdlSnapshots.get(playlistId.toString()); }
  setSpotdlSnapshot(playlistId, snapshotId) { this.#spotdlSnapshots.set(playlistId.toString(), snapshotId); }
  deleteSpotdlSnapshot(playlistId) { this.#spotdlSnapshots.delete(playlistId.toString()); }

  getZotifySnapshot(playlistId) { return this.#zotifySnapshots.get(playlistId.toString()); }
  setZotifySnapshot(playlistId, snapshotId) { this.#zotifySnapshots.set(playlistId.toString(), snapshotId); }
  deleteZotifySnapshot(playlistId) { this.#zotifySnapshots.delete(playlistId.toString()); }

  isAuthStateValid(state) {
    const [ stateUserId, spotifyState ] = state.toString().split(':');
    const savedState = this.getUserIdStateMap(stateUserId);
    this.deleteUserIdStateMap(stateUserId);

    return spotifyState === savedState;
  }
}

const INSTANCE = new GlobalState();
Object.freeze(INSTANCE);

module.exports = INSTANCE;