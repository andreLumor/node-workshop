import { type Torrent } from "./Torrent.js";

export type TorrentRepository = {
  create: (torrent: Torrent) => Promise<void>;
};