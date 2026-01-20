import { GameInfoPlus, GameInfo } from "../models/GameInfo";
import { SortOption } from "../models/FilterOptions";
const memoize = require("fast-memoize");

/**
 * A soter takes a collection and returns that collection sorted.
 */
export interface Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[];
}

export class BggRatingSorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.averageRatingSorter)];
    }
    private averageRatingSorter(a: GameInfo, b: GameInfo): number {
        return b.averagerating - a.averagerating;
    }
}

export class HeavySorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.weightHeavySort)];
    }
    private weightHeavySort(a: GameInfoPlus, b: GameInfoPlus): number {
        const aValue = "weight" in a ? a.weight : undefined;
        const bValue = "weight" in b ? b.weight : undefined;
        return (bValue || 0) - (aValue || 0);
    }
}

export class LightSorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.weightLightSort)];
    }
    private weightLightSort(a: GameInfoPlus, b: GameInfoPlus): number {
        const aValue = "weight" in a ? a.weight : undefined;
        const bValue = "weight" in b ? b.weight : undefined;
        return (aValue || 99) - (bValue || 99);
    }

}

interface IndexMap {
    [gameid: number]: number[];

}

export class MultiSorter implements Sorter {

    innerSorters: Sorter[];

    constructor(innerSorters: Sorter[]) {
        this.innerSorters = innerSorters;
    }

    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        const mutableCollection = [...collection];
        const sortedCollections = this.innerSorters.map((sorter) => sorter.sort(mutableCollection));
        const indexMaps = sortedCollections.map((collection) => collection.reduce((prev, cur, index) => {
            prev[cur.id] = [index];
            return prev;
        }, {} as IndexMap));
        const multiScoreMap = indexMaps.reduce((prev, cur) => {
            Object.keys(cur).forEach((gameId) => {
                prev[gameId] = (prev[gameId] || []).concat(cur[gameId]);
            });
            return prev;
        }, {} as IndexMap);
        const combinedComparator = this.createCompareWithMap(multiScoreMap);
        return mutableCollection.sort(combinedComparator);
    }

    private createCompareWithMap(indexMap: IndexMap) {
        return (a: GameInfo, b: GameInfo) => {
            const aScore = indexMap[a.id].reduce((p, c) => p + c, 0);
            const bScore = indexMap[b.id].reduce((p, c) => p + c, 0);
            const score = aScore - bScore;
            return score === 0 ? indexMap[a.id][0] - indexMap[b.id][0] : score;
        };
    }

}

export class NameSorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.nameSorter)];
    }
    private nameSorter(a: GameInfo, b: GameInfo): number {
        return a.name.localeCompare(b.name);
    }

}

export class OldSorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.oldYearSorter)];
    }
    private oldYearSorter(a: GameInfo, b: GameInfo): number {
        return (a.yearPublished || Infinity) - (b.yearPublished || Infinity);
    }
}

function getSafePlayCount(a: GameInfoPlus) {
    return ("plays" in a && a.plays && a.plays.length) || 0;
}

export class PlayedALotSorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.recentlySoter)];
    }
    private recentlySoter(a: GameInfoPlus, b: GameInfoPlus): number {
        return getSafePlayCount(b) - getSafePlayCount(a);
    }

}

function getSafeLastPlayed(a: GameInfoPlus) {
    return ("lastPlayed" in a && a.lastPlayed && a.lastPlayed.getTime()) || 0;
}

export class PlayedLongAgoSorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.recentlySoter)];
    }
    private recentlySoter(a: GameInfoPlus, b: GameInfoPlus): number {
        return getSafeLastPlayed(a) - getSafeLastPlayed(b);
    }

}

export class PlayedNotALotSorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.recentlySoter)];
    }
    private recentlySoter(a: GameInfoPlus, b: GameInfoPlus): number {
        return getSafePlayCount(a) - getSafePlayCount(b);
    }

}

export class RecentlyPlayedSorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.recentlySoter)];
    }
    private recentlySoter(a: GameInfoPlus, b: GameInfoPlus): number {
        return getSafeLastPlayed(b) - getSafeLastPlayed(a);
    }

}

export class SuggestedPlayersSorter implements Sorter {
    playerCount?: number;

    constructor(playerCount?: number) {
        this.playerCount = playerCount;
    }

    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        const immutableCollection = [...collection];
        if (this.playerCount !== undefined) {
            return immutableCollection.sort(this.getSuggestedComparatorComparator(this.playerCount));
        }
        return immutableCollection;

    }
    private getSuggestedComparatorComparator(playerCount: number) {
        return (a: GameInfoPlus, b: GameInfoPlus) => {
            return this.getSuggestePlayerScore(playerCount, b) - this.getSuggestePlayerScore(playerCount, a);
        };
    }

    private getSuggestePlayerScore(playerCount: number, gameInfo: GameInfoPlus): number {
        if ("suggestedNumberOfPlayers" in gameInfo) {
            const votes = gameInfo.suggestedNumberOfPlayers[playerCount] || gameInfo.suggestedNumberOfPlayers[Infinity];
            if (votes !== undefined) {
                const total = votes.best + votes.recommended + votes.notRecommended;
                const score = (votes.best / total * 3) + (votes.recommended / total) - (votes.notRecommended / total * 2);
                return score;
            }
        }
        return -Infinity;


    }
}

export class UserRatingSorter implements Sorter {

    constructor() {
        this.userRatingSorter = this.userRatingSorter.bind(this);
    }

    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.userRatingSorter)];
    }

    private userRatingSorter(a: GameInfo, b: GameInfo): number {
        const aRating = this.getAverageUserRating(a);
        const bRating = this.getAverageUserRating(b);
        return (bRating || 0) - (aRating || 0);
    }

    private getAverageUserRating(a: GameInfo) {
        const scoreMap = a.userRating;
        if (!scoreMap) {
            return undefined;
        } else {
            const userNames = Object.keys(scoreMap);
            const userNamesWithRatings = userNames.filter((name) => scoreMap[name]);
            if (userNamesWithRatings.length === 0) {
                return undefined;
            }
            const sum = userNamesWithRatings.reduce((p, c) => p + scoreMap[c], 0);
            return sum / userNamesWithRatings.length;
        }
    }
}

export class YoungSorter implements Sorter {
    sort(collection: GameInfoPlus[]): GameInfoPlus[] {
        return [...collection.sort(this.newYearSorter)];
    }
    private newYearSorter(a: GameInfo, b: GameInfo): number {
        return (b.yearPublished || -100000) - (a.yearPublished || -10000);
    }
}

const sortMap = {
    alphabetic: new NameSorter(),
    bggrating: new BggRatingSorter(),
    new: new YoungSorter(),
    old: new OldSorter(),
    userrating: new UserRatingSorter(),
    "weight-heavy": new HeavySorter(),
    "weight-light": new LightSorter(),
    "playedRecently": new RecentlyPlayedSorter(),
    "playedLongAgo": new PlayedLongAgoSorter(),
    "playedALot": new PlayedALotSorter(),
    "playedNotALot": new PlayedNotALotSorter()
};

const DEFAULT_OPTION = "bggrating";

function getSorterInner(sortOption: (SortOption | SortOption[]) = DEFAULT_OPTION): Sorter {
    if (Array.isArray(sortOption)) {
        const innerSorters = sortOption.map(getSorterInner);
        return new MultiSorter(innerSorters);
    }
    if (typeof sortOption === "object") {
        return new SuggestedPlayersSorter(sortOption.numberOfPlayers);
    }
    return sortMap[sortOption];
}

const getSorter = memoize(getSorterInner);


export class GameSorter {

    constructor() {
        this.sortCollection = memoize(this.sortCollectionInner);

    }

    public sortCollection: (collection: GameInfoPlus[], sortOption: (SortOption | SortOption[])) => GameInfoPlus[];

    private sortCollectionInner(collection: GameInfoPlus[], sortOption: (SortOption | SortOption[])): GameInfoPlus[] {
        const sorter = getSorter(sortOption);
        return sorter.sort([...collection]);
    }

}
