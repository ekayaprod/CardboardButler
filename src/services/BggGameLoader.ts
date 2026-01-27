import BggGameService, { BggRetryResult } from "./BggGameService";
import { GameInfo, GameInfoPlus, ExtendedGameInfo, PlayInfo, GamePlayInfo } from "../types";
const memoize = require("fast-memoize");

// --- CollectionMerger ---

export interface CollectionMap {
    [username: string]: GameInfo[];
}

export interface CollectionMapPlus {
    [username: string]: GameInfoPlus[];
}

interface GameIdCache {
    [id: number]: GameInfo | undefined;
}


/**
 * A collection merger, can merge multiple collections of game inforamtion.
 */
export class CollectionMerger {

    /**
    * Merges multiple collections.
    * A single game array is returned, with one instance of each game in the collections.
    * Each game has had its owners and userratings fields updated, to include each owner and their rating.
    * @param collectionsMap A map between usernames and their collections
    */
    public getMergedCollection: (collectionsMap: CollectionMapPlus) => GameInfo[];

    constructor() {
        this.getMergedCollection = memoize(this.getMergedCollectionInner);
    }

    private getMergedCollectionInner(collectionsMap: CollectionMapPlus): GameInfo[] {
        const cache: GameIdCache = {};
        const sharedUserRatingSet = new Set<number>();
        const userNames = Object.keys(collectionsMap);
        userNames.forEach((username) => {
            const currentCollection = collectionsMap[username];
            currentCollection.forEach((currentGame) => {
                const alreadyKnownGame = cache[currentGame.id];
                if (alreadyKnownGame) {
                    alreadyKnownGame.owners.push(username);
                    if (currentGame.userRating) {
                        if (!alreadyKnownGame.userRating) {
                            alreadyKnownGame.userRating = Object.assign({}, currentGame.userRating);
                        } else {
                            if (sharedUserRatingSet.has(currentGame.id)) {
                                alreadyKnownGame.userRating = Object.assign({}, alreadyKnownGame.userRating);
                                sharedUserRatingSet.delete(currentGame.id);
                            }
                            Object.assign(alreadyKnownGame.userRating, currentGame.userRating);
                        }
                    }
                } else {
                    cache[currentGame.id] = Object.assign({}, currentGame, { owners: [username] });
                    if (currentGame.userRating) {
                        sharedUserRatingSet.add(currentGame.id);
                    }
                }
            });
        });
        return Object.values(cache);
    }
}

// --- BggGameLoader ---


interface LoadingStatus {
    isLoading: boolean;
    retryInfo?: BggRetryResult;
}


interface GameLoadingInfo {
    type: "game";
    gameinfo: GameInfo;
}

interface CollectionLoadingInfo {
    type: "collection";
    username: string;
}

export interface PlaysLoadingInfo {
    type: "plays";
    username: string;
}
const storageVersion = "2";


export type LoadingInfo = LoadingStatus & (GameLoadingInfo | CollectionLoadingInfo | PlaysLoadingInfo);

interface ExtraInfoMap {
    [id: number]: (ExtendedGameInfo | undefined);
}

interface PlaysMap {
    [username: string]: (PlayInfo[] | undefined);
}

type CollectionUpdateEventHandler = (games: GameInfoPlus[]) => void;
type LoadingUpdateEventHandler = (games: LoadingInfo[]) => void;


export default class BggGameLoader {

    private readonly service: BggGameService;
    private collectionMap: CollectionMapPlus = {};

    private extraInfoMap: ExtraInfoMap = {};
    private playsMap: PlaysMap = {};


    private currentNames: string[] = [];
    private loadingInfo: LoadingInfo[] = [];
    private readonly eventHandlers: CollectionUpdateEventHandler[] = [];
    private readonly loadingEventHandlers: LoadingUpdateEventHandler[] = [];

    private readonly merger: CollectionMerger;
    private useCache: boolean;


    private concurrentRequestLimit = 5;


    constructor(bggService: BggGameService, merger: CollectionMerger, useCache = false) {
        this.service = bggService;
        this.loadCollections = this.loadCollections.bind(this);
        this.loadCollectionWithRetry = this.loadCollectionWithRetry.bind(this);
        this.getAllGamesPlus = this.getAllGamesPlus.bind(this);
        this.getAllGamesPlusPure = this.getAllGamesPlusPure.bind(this);
        this.informCollectionUpdateHandlers = this.informCollectionUpdateHandlers.bind(this);
        this.getAllGamesPlusPureMemo = memoize(this.getAllGamesPlusPure);
        this.getShownGamesMapMemo = memoize(this.getShownGamesMap);
        this.getGamesWithExtraInfoMemo = memoize(this.getGamesWithExtraInfo);
        this.getGamesWithPlayInfoMemo = memoize(this.getGamesWithPlayInfo);
        this.merger = merger;
        this.useCache = useCache;
        this.extraInfoMap = {};
        this.loadCollectionsFromCache();
        this.loadExtraInfo();
        this.setStorageVersion();
    }

    public async loadCollections(usernames: string[]): Promise<GameInfo[][]> {
        this.currentNames = usernames;
        this.informCollectionUpdateHandlers();
        return await Promise.all(usernames.map(async (username) => {
            const games = await this.loadCollectionWithRetry(username);
            this.collectionMap[username] = games;
            this.storeCollections();
            this.informCollectionUpdateHandlers();
            return games;
        }));

    }

    public async loadExtendedInfo() {
        const allGames = this.getAllGamesPlus();
        const allUnknownGames = allGames.filter((game) => this.extraInfoMap[game.id] === undefined);
        const loadingInfo: LoadingInfo[] = allUnknownGames.map((game) => ({
            type: "game",
            isLoading: false,
            gameinfo: game
        }));
        this.loadingInfo = [...loadingInfo, ...this.loadingInfo];
        const chunks = this.chunk(allUnknownGames, 50);
        return await Promise.all(chunks.map((unknownGames) => {
            return this.loadGamesWithRetry(unknownGames).then((extraInfos) => {
                extraInfos.forEach((extraInfo, i) => {
                    this.extraInfoMap[unknownGames[i].id] = extraInfo;
                });
                this.informCollectionUpdateHandlers();
                return extraInfos;
            });
        })).then((games) => {
            this.storeExtraInfo();
            return games;
        });
    }

    private chunk<T>(input: T[], chunkSize: number): T[][] {
        const chunked_arr: T[][] = [];
        const copied = [...input];
        const numOfChild = Math.ceil(copied.length / chunkSize);
        for (let i = 0; i < numOfChild; i++) {
            chunked_arr.push(copied.splice(0, chunkSize));
        }
        return chunked_arr;
    }


    private storeExtraInfo() {
        if (localStorage && this.useCache) {
            localStorage.setItem("extrainfo", JSON.stringify(this.extraInfoMap));
        }
    }

    private loadExtraInfo() {
        this.extraInfoMap = {};
        if (localStorage && this.useCache) {
            if (localStorage.getItem("storageVersion") !== storageVersion) {
                localStorage.removeItem("extrainfo");
            }
            const cache = JSON.parse(localStorage.getItem("extrainfo")) as ExtraInfoMap;
            if (cache) {
                this.extraInfoMap = cache;
            }
        }
    }
    private setStorageVersion() {
        if (localStorage && this.useCache) {
            localStorage.setItem("storageVersion", storageVersion);
        }
    }


    private storeCollections() {
        if (localStorage && this.useCache) {
            localStorage.setItem("collections", JSON.stringify(this.collectionMap));
        }
    }

    private loadCollectionsFromCache() {
        this.collectionMap = {};
        if (localStorage && this.useCache) {
            if (localStorage.getItem("storageVersion") !== storageVersion) {
                localStorage.removeItem("collections");
            }
            const cache = JSON.parse(localStorage.getItem("collections")) as CollectionMap;
            if (cache) {
                this.collectionMap = cache;
            }
        }
    }

    private getShownGamesMapMemo: (currentNames: string[], collectionMap: CollectionMap) => CollectionMap;
    private getShownGamesMap(currentNames: string[], collectionMap: CollectionMap) {
        return currentNames.reduce((prev, cur) => {
            const known = collectionMap[cur];
            if (known) {
                prev[cur] = known;
            }
            return prev;
        }, {} as CollectionMap);
    }

    private getGamesWithExtraInfoMemo: (games: GameInfo[], extraInfoMap: ExtraInfoMap) => GameInfoPlus[];

    private getGamesWithExtraInfo(games: GameInfo[], extraInfoMap: ExtraInfoMap) {
        return games.map((ag) => Object.assign({}, ag, extraInfoMap[ag.id] || {}));
    }


    private getGamesWithPlayInfoMemo: (currentNames: string[], games: GameInfo[], playsMap: PlaysMap) => GameInfo[];

    private getGamesWithPlayInfo(currentNames: string[], games: GameInfo[], playsMap: PlaysMap) {
        if (Object.keys(playsMap).length > 0) {
            const playsByGameId: { [gameId: number]: PlayInfo[] } = {};

            currentNames.forEach((name) => {
                const usersPlays = playsMap[name];
                if (usersPlays) {
                    for (let i = 0; i < usersPlays.length; i++) {
                        const usersPlay = usersPlays[i];
                        const gameId = usersPlay.gameId;
                        if (!playsByGameId[gameId]) {
                            playsByGameId[gameId] = [];
                        }
                        playsByGameId[gameId].push(Object.assign({}, usersPlay, { playedBy: name }));
                    }
                }
            });

            const allGamesWithPlays = games.map((game) => {
                const allPlaysOfGame = playsByGameId[game.id] || [];

                const lastPlayInMinutes = allPlaysOfGame.reduce((prev, cur) => Math.max(prev, cur.date.getTime()), 0);
                const timePlayedInMinutes = allPlaysOfGame.reduce((prev, cur) => prev + (cur.length || 0), 0);
                const result: GamePlayInfo = {
                    plays: allPlaysOfGame,
                    lastPlayed: lastPlayInMinutes ? new Date(lastPlayInMinutes) : undefined,
                    timePlayedMinutes: timePlayedInMinutes

                };
                return Object.assign({}, game, result);
            });
            return allGamesWithPlays;

        } else {
            return games;
        }
    }

    private getAllGamesPlus() {
        const { currentNames, collectionMap, extraInfoMap, playsMap } = this;
        return this.getAllGamesPlusPureMemo(currentNames, collectionMap, extraInfoMap, playsMap);
    }

    private getAllGamesPlusPureMemo: (currentNames: string[], collectionMap: CollectionMapPlus, extraInfoMap: ExtraInfoMap, playsMap: PlaysMap) => GameInfo[];

    private getAllGamesPlusPure(currentNames: string[], collectionMap: CollectionMapPlus, extraInfoMap: ExtraInfoMap, playsMap: PlaysMap): GameInfo[] {
        const shownGamesMap = this.getShownGamesMapMemo(currentNames, collectionMap);
        const allGames = this.merger.getMergedCollection(shownGamesMap);
        const allGamesPlus = this.getGamesWithExtraInfoMemo(allGames, extraInfoMap);
        const allGamesPlusWithPlays = this.getGamesWithPlayInfoMemo(currentNames, allGamesPlus, playsMap);
        return allGamesPlusWithPlays;
    }



    private informCollectionUpdateHandlers() {
        const allGamesPlus = this.getAllGamesPlus();
        this.eventHandlers.forEach((handler) => handler(allGamesPlus));
    }

    private informLoadingHandlers() {
        const loadingInfo = this.getLoadingInfo();
        this.loadingEventHandlers.forEach((handler) => handler(loadingInfo));
    }

    public async loadPlays() {
        const names = this.currentNames;
        return Promise.all(names.map(async (name) => {
            this.loadingInfo = this.loadingInfo.filter((n) => n.type !== "plays" || (n.type === "plays" && n.username !== name));
            this.loadingInfo.push({
                isLoading: true,
                type: "plays",
                username: name
            });
            this.informLoadingHandlers();
            const playerPlays = await this.loadPlaysWithRetry(name);
            this.playsMap[name] = playerPlays;
            this.loadingInfo = this.loadingInfo.filter((n) => n.type !== "plays" || (n.type === "plays" && n.username !== name));
            this.informLoadingHandlers();
            this.informCollectionUpdateHandlers();
        }));
    }

    private async loadPlaysWithRetry(name: string): Promise<PlayInfo[]> {
        const plays = await this.service.getPlays(name);
        if (Array.isArray(plays)) {
            return plays;
        }
        const retryTime = plays && plays.backoff ? 10000 : 1000;
        return new Promise<PlayInfo[]>(resolver => {
            setTimeout(() => resolver(this.loadPlaysWithRetry(name)), retryTime);
        });

    }


    private async loadCollectionWithRetry(name: string): Promise<GameInfo[]> {
        this.loadingInfo = this.loadingInfo.filter((n) => n.type === "collection" && n.username !== name);
        this.loadingInfo.push({
            isLoading: true,
            type: "collection",
            username: name
        });
        this.informLoadingHandlers();
        const games = await this.service.getUserCollection(name);
        if (Array.isArray(games)) {
            this.loadingInfo = this.loadingInfo.filter((n) => n.type === "collection" && n.username !== name);
            this.informLoadingHandlers();
            return games;
        } else {
            const retryTime = games && games.backoff ? 10000 : 1000;
            return new Promise<GameInfo[]>(resolver => {
                setTimeout(() => resolver(this.loadCollectionWithRetry(name)), retryTime);
            });
        }
    }

    private async loadGamesWithRetry(games: GameInfo[]) {
        const ids = games.map((g) => g.id);
        ids.forEach((id) => {
            const loadingIndex = this.loadingInfo.findIndex((li) => li.type === "game" && li.gameinfo.id === id);
            this.loadingInfo[loadingIndex].isLoading = true;
            this.loadingInfo[loadingIndex].retryInfo = undefined;
        });
        this.informLoadingHandlers();
        const extendeds = await this.service.getGamesInfo(ids);
        if (!("retryLater" in extendeds)) {
            ids.forEach((id) => {
                this.loadingInfo = this.loadingInfo.filter((g) => g.type !== "game" || g.gameinfo.id !== id);
            });
            this.informLoadingHandlers();
            return extendeds;
        } else {
            const retryTime = (extendeds && extendeds.backoff) ? 10000 : 3000;
            if (extendeds && extendeds.backoff) {
                this.concurrentRequestLimit = Math.max(this.concurrentRequestLimit - 1, 1);
            }
            ids.forEach((id) => {
                const loadingIndex = this.loadingInfo.findIndex((li) => li.type === "game" && li.gameinfo.id === id);
                this.loadingInfo[loadingIndex].retryInfo = extendeds;
            });
            this.informLoadingHandlers();
            return new Promise<ExtendedGameInfo[]>(resolver => {
                setTimeout(() => resolver(this.loadGamesWithRetry(games)), retryTime);
            });
        }
    }

    public onGamesUpdate(handler: CollectionUpdateEventHandler) {
        this.eventHandlers.push(handler);
    }

    public getLoadingInfo(): LoadingInfo[] {
        return this.loadingInfo;
    }



    public onLoadUpdate(handler: LoadingUpdateEventHandler) {
        this.loadingEventHandlers.push(handler);
    }


}