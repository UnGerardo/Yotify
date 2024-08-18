import { SPOTDL } from "./constants";

class GlobalState {
  static instance: GlobalState;

  spotifyToken: string = '';
  spotifyTokenType: string = '';
  spotifyTokenExpiry: number = 0;

  userId: number = 0;
  userIdStateMap: Map<number, string> = new Map<number, string>();

  snapshots: {
    'spotdl': Map<string, string>,
    'zotify': Map<string, string>
  } = {
    'spotdl': new Map<string, string>(),
    'zotify': new Map<string, string>()
  };

  constructor() {
    if (!GlobalState.instance) {
      GlobalState.instance = this;
    }
    return GlobalState.instance;
  }

  getSnapshot(downloader: Downloader, playlistId: string): string | undefined {
    return downloader === SPOTDL ? this.snapshots.spotdl.get(playlistId) : this.snapshots.zotify.get(playlistId);
  }
  setSnapshot(downloader: Downloader, playlistId: string, snapshotId: string): void {
    if (downloader === SPOTDL) {
      this.snapshots.spotdl.set(playlistId, snapshotId);
    } else {
      this.snapshots.zotify.set(playlistId, snapshotId);
    }
  }
  deleteSnapshot(downloader: Downloader, playlistId: string): void {
    if (downloader === SPOTDL) {
      this.snapshots.spotdl.delete(playlistId);
    } else {
      this.snapshots.zotify.delete(playlistId);
    }
  }

  isAuthStateValid(retrievedState: string): boolean {
    const splitState = retrievedState.split(':');
    const retrievedUserId: number = parseInt(splitState[0]);
    const retrievedStr: string = splitState[1];

    const savedStr = this.userIdStateMap.get(retrievedUserId);
    this.userIdStateMap.delete(retrievedUserId);

    return retrievedStr === savedStr;
  }
}

const globalState: GlobalState = new GlobalState();
Object.freeze(globalState);

export default globalState;