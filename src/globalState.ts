
class GlobalState {
  #spotifyToken: string = '';
  #spotifyTokenType: string = '';
  #spotifyTokenExpiry: number = 0;

  #userIdStateMap: Map<string, string> = new Map();
  #userId: number = 0;

  #spotdlSnapshots: Map<string, string> = new Map();
  #zotifySnapshots: Map<string, string> = new Map();

  static instance: GlobalState;

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

  getUserIdStateMap(userId: string): string | undefined { return this.#userIdStateMap.get(userId); }
  setUserIdStateMap(userId: string, string: string): void { this.#userIdStateMap.set(userId, string); }
  deleteUserIdStateMap(userId: string): void { this.#userIdStateMap.delete(userId); }

  get userId(): number { return this.#userId; }
  incrementUserId(): void { this.#userId++; }

  getSpotdlSnapshot(playlistId: string): string | undefined { return this.#spotdlSnapshots.get(playlistId); }
  setSpotdlSnapshot(playlistId: string, snapshotId: string): void { this.#spotdlSnapshots.set(playlistId, snapshotId); }
  deleteSpotdlSnapshot(playlistId: string): void { this.#spotdlSnapshots.delete(playlistId); }

  getZotifySnapshot(playlistId: string): string | undefined { return this.#zotifySnapshots.get(playlistId); }
  setZotifySnapshot(playlistId: string, snapshotId: string): void { this.#zotifySnapshots.set(playlistId, snapshotId); }
  deleteZotifySnapshot(playlistId: string): void { this.#zotifySnapshots.delete(playlistId); }

  isAuthStateValid(state: string): boolean {
    const [ stateUserId, spotifyState ] = state.split(':');
    const savedState = this.getUserIdStateMap(stateUserId);
    this.deleteUserIdStateMap(stateUserId);

    return spotifyState === savedState;
  }
}

const globalState: GlobalState = new GlobalState();
Object.freeze(globalState);

export default globalState;