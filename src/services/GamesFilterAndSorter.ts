import { GameInfoPlus, GameInfo } from "../models/GameInfo";
import { FilterAndSortOptions } from "../models/FilterOptions";
import { GameSorter } from "./GameSorters";
const memoize = require("fast-memoize");

export class GameFilterer {

    constructor() {
        this.filterCollectionInner = this.filterCollectionInner.bind(this);
        this.filterCollection = memoize(this.filterCollectionInner);
    }

    public filterCollection: (collection: GameInfo[], options: FilterAndSortOptions) => GameInfo[];

    private filterCollectionInner(collection: GameInfo[], options: FilterAndSortOptions) {
        const { playtime, playerCount } = options;
        if (playtime) {
            collection = this.filterOnTime(collection, playtime);
        }
        if (playerCount) {
            collection = this.filterOnPlayerCount(collection, playerCount);
        }
        return collection;
    }

    private filterOnTime(collection: GameInfo[], playtime: { minimum?: number; maximum?: number; }) {
        const { minimum = 0, maximum = Infinity } = playtime;
        return collection.filter((game) =>
            minimum <= (game.minPlaytime || 0) && (game.maxPlaytime || Infinity) <= maximum
        );
    }

    private filterOnPlayerCount(collection: GameInfo[], playerCount: number) {
        return collection.filter((game) => game.minPlayers <= playerCount && playerCount <= game.maxPlayers);
    }
}

/**
 * Filters and sorts a given collection and some options on how to do it.
 */
export class GamesFilterAndSorter {
    sorter: GameSorter;
    filterer: GameFilterer;

    constructor(sorter: GameSorter = new GameSorter(), filterer: GameFilterer = new GameFilterer()) {
        this.sorter = sorter;
        this.filterer = filterer;
        this.filterAndSortInner = this.filterAndSortInner.bind(this);
        this.filterAndSort = memoize(this.filterAndSortInner);
    }

    /**
     * Filters and sorts a given collection, returns a new collection.
     * @param collection a collection of games to filter and sort
     * @param options optional options, that defines how the collection should be filtered and sorted.
     */

    filterAndSort: (collection: GameInfoPlus[], options?: FilterAndSortOptions) => GameInfoPlus[];

    filterAndSortInner(collection: GameInfoPlus[], options: FilterAndSortOptions = {}): GameInfoPlus[] {
        const collectionCopy = [...collection];
        const filtered = this.filterer.filterCollection(collectionCopy, options);
        return this.sorter.sortCollection(filtered, options.sortOption);
    }


}
