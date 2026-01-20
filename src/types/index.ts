
/**
 * Given a url and init, can give a response.
 * Usually in browsers this is used by fetch
 * This is mostly used to pass fetch mocks to the different services.
 */
export type FetchService = (url: RequestInfo, init?: RequestInit) => Promise<Response>;

/**
 * Defines a maximum and minimum time (in minutes), that a game must be playable in.
 */
export interface PlayTimeOption {
    minimum?: number;
    maximum?: number;
}

/**
 * A number of players this game must be playable with.
 */
export type PlayCountOption = number;


/**
 * Defines how to sort the collection.
 */
export type SortOption = SimpleSortOption | ParametricSortOption;

export type SimpleSortOption = "alphabetic" | "bggrating" | "new" | "old" | "userrating" | "weight-light" | "weight-heavy" | "playedRecently" | "playedLongAgo" | "playedALot" | "playedNotALot";

export type ParametricSortOption = {
    type: "suggestedPlayers",
    numberOfPlayers?: number
};


/**
 * Defines how to filter and sort a collection.
 */
export interface FilterAndSortOptions {
    playtime?: PlayTimeOption;
    playerCount?: PlayCountOption;
    sortOption?: SortOption | SortOption[];
}

/**
 * A bgg Family defines a group of games a game relates to, examples are War Games or Thematic Games.
 */
interface BoardGameFamily {
    name: string;
    friendlyName: string;
    value: number;
    bayesaverage: number;
}

/**
 * Information about a BGG Game.
 */
export interface GameInfo {
    id: number;
    name: string;
    thumbnailUrl: string;
    imageUrl: string;
    yearPublished?: number;
    minPlayers?: number;
    maxPlayers?: number;
    minPlaytime?: number;
    maxPlaytime?: number;
    playingTime?: number;
    averagerating: number;
    families: BoardGameFamily[];
    owners?: string[];
    userRating?: { [username: string]: number | undefined };
}


export interface NumberOfPlayersVotes {
    numberOfPlayers: number;
    best: number;
    recommended: number;
    notRecommended: number;
}

export interface SuggestedNumberOfPlayersMap {
    [numberOfPlayers: number]: NumberOfPlayersVotes | undefined;
}


export interface ExtendedGameInfo {
    description?: string;
    weight?: number;
    mechanics?: string[];
    categories?: string[];
    suggestedNumberOfPlayers: SuggestedNumberOfPlayersMap;
}


export interface GamePlayInfo {
    plays?: PlayInfo[] | undefined;
    lastPlayed?: Date;
    timePlayedMinutes: number;
}

export interface PlayInfo {
    playId: number;
    date: Date;
    quantity: number;
    length?: number;
    gameId: number;
    playedBy?: string;
}

export type FullGameInfo = GameInfo & ExtendedGameInfo & GamePlayInfo;

export type GameInfoPlus = GameInfo | FullGameInfo;

interface ValidUser {
    isValid: true;
    username: string;
}

interface InvalidUser {
    isValid: false;
}

interface IsError {
    isValid: "unknown";
    error: Error | string;
}

/**
 * Information about a user.
 * This includes if the user exists/isvalid or if it is currently unknown since there was an error.
 */
export type UserInfo = ValidUser | InvalidUser | IsError;
