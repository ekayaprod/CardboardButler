import { GameInfo, GameInfoPlus } from "../types";

export interface CollectionMap {
    [username: string]: GameInfo[];
}

export interface CollectionMapPlus {
    [username: string]: GameInfoPlus[];
}

interface GameIdCache {
    [id: number]: GameInfo | undefined;
}

const memoize = require("fast-memoize");


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
        const userNames = Object.keys(collectionsMap);
        userNames.forEach((username) => {
            const currentCollection = collectionsMap[username];
            currentCollection.forEach((currentGame) => {
                const alreadyKnownGame = cache[currentGame.id];
                if (alreadyKnownGame) {
                    alreadyKnownGame.owners.push(username);
                    if (currentGame.userRating) {
                        if (!alreadyKnownGame.userRating) {
                            alreadyKnownGame.userRating = {};
                        }
                        Object.assign(alreadyKnownGame.userRating, currentGame.userRating);
                    }
                } else {
                    const newGame = Object.assign({}, currentGame, { owners: [username] });
                    if (newGame.userRating) {
                        newGame.userRating = Object.assign({}, newGame.userRating);
                    }
                    cache[currentGame.id] = newGame;
                }
            });
        });
        return Object.values(cache);
    }
}
