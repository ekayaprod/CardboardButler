import * as React from "react";
import { Container, Header, Icon, Divider, List, Item, Card, Image, Button, Dimmer, Segment, Dropdown } from "semantic-ui-react";
import { FilterAndSortOptions, GameInfoPlus, GameInfo, ExtendedGameInfo, PlayTimeOption, PlayCountOption, SortOption } from "../types";
import { GamesFilterAndSorter } from "../services/GamesFilterAndSorter";

// --- DescriptionGenerator ---

const ratingNames = [
    "Outstanding",
    "Outstanding",
    "Very good",
    "Good",
    "Ok",
    "Mediocre",
    "Not so good",
    "Bad",
    "Very bad",
    "Awful"
].reverse();

const weightName = [
    "Very easy",
    "Easy",
    "Moderately difficult",
    "Somewhat hard",
    "Hard",
    "Very Hard"
];

const vowel_list = "aeiouAEIOU";


/**
 * Can generate a human readable describtion of a given game.
 */
export class DescriptionGenerator {

    /**
     * Given game information, generates a human readable description.
     * @param gameInfo the game to generate a description for.
     */
    generateDescription(gameInfo: GameInfoPlus): string {
        const rating = this.getRatingDescription(gameInfo.averagerating);
        const family = this.getFamilyDescription(gameInfo);
        const players = this.getPlayerInfoString(gameInfo);
        const playtime = this.getTimeInfoString(gameInfo);
        const aOrAn = this.getAOrAn(family);
        let firstString = `${aOrAn} ${family} for ${players} in ${playtime}.`;

        const hasWeight = ("weight" in gameInfo) && gameInfo.weight !== undefined;
        if (hasWeight || gameInfo.averagerating !== undefined) {
            firstString += ` Most people think it is `;
        }
        if (gameInfo.averagerating !== undefined) {
            firstString += rating.toLowerCase();
            if (!hasWeight) {
                firstString += ".";
            }
        }
        if (hasWeight && gameInfo.averagerating !== undefined) {
            firstString = firstString + " and ";
        }
        if (hasWeight) {
            const weight = this.getWeightInfo(gameInfo as ExtendedGameInfo);
            firstString += weight + " to learn.";
        }
        return firstString;
    }

    private isVowel(input: string) {
        return vowel_list.indexOf(input) > -1;
    }

    private getAOrAn(input: string) {
        if (this.isVowel(input.charAt(0))) {
            return "An";
        }
        return "A";
    }

    private getFamilyDescription(gameInfo: GameInfoPlus) {
        if (gameInfo.families === undefined || gameInfo.families.length === 0) {
            return "boardgame";
        }
        const bestFamily = gameInfo.families.sort((a, b) => a.value - b.value)[0];
        let name = bestFamily.friendlyName.toLowerCase();
        if (name.indexOf(" rank") > -1) {
            name = name.substring(0, name.indexOf(" rank"));
        }
        if (!name.endsWith("game")) {
            name += " game";
        }
        return name;
    }

    private getRatingDescription(ratingValue?: number) {
        const ratingIndex = Math.round(ratingValue);
        const ratingInfo = ratingNames[ratingIndex - 1];
        return ratingInfo ? ratingInfo : "";
    }

    private getPlayerInfoString(gameInfo: GameInfoPlus) {
        let playerInfo = "";
        const { minPlayers, maxPlayers } = gameInfo;

        if (minPlayers === maxPlayers) {
            playerInfo += maxPlayers + " player";
        } else {
            playerInfo += minPlayers + " to " + maxPlayers + " player";
        }
        if (maxPlayers > 1) {
            playerInfo += "s";
        }
        return playerInfo;
    }

    private getTimeInfoString(gameInfo: GameInfo) {
        let timeInfo = "";

        const mintime = gameInfo.minPlaytime;
        const maxtime = gameInfo.maxPlaytime;

        if (mintime === maxtime) {
            timeInfo += maxtime + " minute";
        } else if (maxtime < mintime) {
            timeInfo += mintime + " minute";
        } else {
            timeInfo += mintime + " - " + maxtime + " minute";
        }
        if (maxtime > 1) {
            timeInfo += "s";
        }
        return timeInfo;
    }

    private getWeightInfo = (gameInfo: ExtendedGameInfo) => {
        const weight = gameInfo.weight;
        const weightIndex = Math.round((weight - 1) / 5 * 6);
        return weightName[Math.max(weightIndex, 0)].toLowerCase();
    }
}

// --- FilterBar ---

export interface FilterBarProps {
    onFilterChange?: (options: FilterAndSortOptions) => any;
    currentUsers?: string[];
}
interface FilterBarState {
    filterOptions: FilterAndSortOptions;
}

interface TimerOptions {
    text: string;
    value: number;
    playtime?: PlayTimeOption;
}

interface PlayerCountOptions {
    text: string;
    value: number;
    playercount?: PlayCountOption;
}

export const playercountOptions: PlayerCountOptions[] = [
    { text: "any number of players", value: 0, playercount: null },
    { text: "1 person", value: 1, playercount: 1 },
];

for (let i = 2; i <= 10; i++) {
    playercountOptions.push({ text: i + " people", value: i, playercount: i });
}

interface SortingOptions {
    text: string;
    value: number;
    sortoption?: SortOption;
    ["data-testid"]?: string;
}

const filterBarInitialState: FilterBarState = {
    filterOptions: {
    }
};

export class FilterBar extends React.Component<FilterBarProps, FilterBarState> {
    constructor(props: FilterBarProps) {
        super(props);
        this.state = filterBarInitialState;
        this.getSortOptionFromIndex = this.getSortOptionFromIndex.bind(this);
        this.getSortOptionFromIndexSingle = this.getSortOptionFromIndexSingle.bind(this);
        this.getDropdownValues = this.getDropdownValues.bind(this);
        this.getSortOptions = this.getSortOptions.bind(this);
    }

    getOptions() {
        const timeOptions: TimerOptions[] = [
            { text: "any time", value: 0, playtime: null },
            { text: "30 minutes or less", value: 1, playtime: { minimum: 0, maximum: 30 } },
            { text: "1 hour or less", value: 2, playtime: { maximum: 60 } },
            { text: "2 hours or less", value: 3, playtime: { maximum: 120 } },
            { text: "3 hours or less", value: 4, playtime: { maximum: 180 } },
            { text: "20-60 minutes", value: 5, playtime: { minimum: 20, maximum: 60 } },
            { text: "1-2 hours", value: 6, playtime: { minimum: 60, maximum: 120 } },
            { text: "2-4 hours", value: 7, playtime: { minimum: 120, maximum: 240 } },
            { text: "4 or more hours", value: 8, playtime: { minimum: 240, maximum: 9999999 } },

        ];
        return timeOptions;
    }

    getSortOptions() {
        const options = this.state.filterOptions.sortOption;
        const allowMultiSelect = Array.isArray(options);
        const { currentUsers = ["Unknown"] } = this.props;
        const oneUser = currentUsers.length <= 1;
        const iWe = oneUser ? "I" : "we";

        const sortingOptions: SortingOptions[] = [
            { text: "are highly rated", value: 0, sortoption: "bggrating" },
            { text: "are alphabetic", value: 1, sortoption: "alphabetic" },
            { text: "are new", value: 2, sortoption: "new", ["data-testid"]: "sortByNew" },
            { text: "are old", value: 3, sortoption: "old" },
            { text: iWe + " rate highly", value: 4, sortoption: "userrating" },
            { text: "are easy to learn", value: 5, sortoption: "weight-light" },
            { text: "are complex", value: 6, sortoption: "weight-heavy" },
            { text: "are best with this number of players", value: 7, ["data-testid"]: "suggestedPlayers" },
            { text: iWe + " played recently", value: 8, sortoption: "playedRecently" },
            { text: iWe + " haven't played in a while", value: 9, sortoption: "playedLongAgo" },
            { text: iWe + " have played a lot", value: 10, sortoption: "playedALot" },
            { text: iWe + " have not played a lot", value: 11, sortoption: "playedNotALot" },
        ];
        const singlePreferenceOption: SortingOptions = { text: iWe + " only have one preference", value: 12, ["data-testid"]: "SortBySingleOption" };
        const multiPreferenceOption: SortingOptions = { text: iWe + " have multiple preferences", value: 12, ["data-testid"]: "SortByMultipleOption" };
        return [...sortingOptions, allowMultiSelect ? singlePreferenceOption : multiPreferenceOption];
    }

    onTimeChange(timerIndex: number) {
        const option = this.getOptions()[timerIndex].playtime;
        this.combineState({ playtime: option });
    }

    onPlayerCountChange(playerCountIndex: number) {
        const option = playercountOptions[playerCountIndex].playercount;
        const sortOption = this.state.filterOptions.sortOption;
        if (Array.isArray(sortOption)) {
            this.combineState({ playerCount: option, sortOption: sortOption.map((so) => typeof so === "object" ? Object.assign({}, this.state.filterOptions.sortOption, { numberOfPlayers: option }) : so) as any });
        } else if (typeof sortOption === "object") {
            this.combineState({ playerCount: option, sortOption: Object.assign({}, this.state.filterOptions.sortOption, { numberOfPlayers: option }) });
        } else {
            this.combineState({ playerCount: option });
        }
    }

    onSortChange(sortOptionIndex: number | number[]) {
        const currentOption = this.state.filterOptions.sortOption;
        const clickedSwitchState = sortOptionIndex === 12 || (Array.isArray(sortOptionIndex) && sortOptionIndex.indexOf(12) > -1);
        if (clickedSwitchState) {
            if (Array.isArray(currentOption)) {
                this.combineState({ sortOption: currentOption[0] });
            } else {
                this.combineState({ sortOption: [currentOption] });
            }
        } else {
            if (Array.isArray(sortOptionIndex)) {
                this.combineState({ sortOption: this.getSortOptionFromIndex(sortOptionIndex) as SortOption[] });
            } else {
                this.combineState({ sortOption: this.getSortOptionFromIndexSingle(sortOptionIndex) });
            }
        }
    }



    getSortOptionFromIndex(sortOptionIndex: number[]) {
        if (sortOptionIndex.length === 0) {
            return this.getSortOptions()[0];
        }
        return sortOptionIndex.map(this.getSortOptionFromIndexSingle);
    }

    getSortOptionFromIndexSingle(sortOptionIndex: number) {
        const sortingOptions = this.getSortOptions();
        let option = sortingOptions[sortOptionIndex].sortoption;
        if (option === undefined && sortingOptions[sortOptionIndex].value === 7) {
            option = {
                type: "suggestedPlayers",
                numberOfPlayers: this.state.filterOptions.playerCount
            };
        }
        return option;
    }

    combineState(options: FilterAndSortOptions) {
        const newFilter = Object.assign({}, this.state.filterOptions, options);
        if (this.props.onFilterChange) {
            this.props.onFilterChange(newFilter);
        }
        this.setState({ filterOptions: newFilter });
    }

    joinWithAndEnd(strings: string[]): string {
        if (strings.length === 1) {
            return strings[0];
        }
        const newStrings = [...strings];
        const last = newStrings.pop();
        return newStrings.join(", ") + " and " + last;
    }

    getDropdownValues() {
        const options = this.state.filterOptions.sortOption;
        const sortingOptions = this.getSortOptions();
        if (options === undefined) {
            return undefined;
        }
        if (Array.isArray(options)) {
            if (options.length === 1 && options[0] === undefined) {
                return [];
            }
            return options.map((o) => typeof o === "object" ? 7 : sortingOptions.findIndex((so) => so.sortoption === o));
        } else {
            return typeof options === "object" ? 7 : sortingOptions.findIndex((so) => so.sortoption === options);
        }
    }

    render() {


        const { currentUsers = ["Unknown"] } = this.props;
        const options = this.state.filterOptions.sortOption;
        const allowMultiSelect = Array.isArray(options);
        const oneUser = currentUsers.length <= 1;
        const iWe = oneUser ? "I" : "we";
        const amAre = oneUser ? "am" : "are";
        const sortingOptions = this.getSortOptions();
        const values = this.getDropdownValues();
        const timeOptions = this.getOptions();
        return (
            <Container fluid>
                <div className="topMenu ui fixed" >
                    <div className="ui container">
                        <span className="topselect">
                            <span>Hi {iWe}  {amAre} </span>
                            <span><a href="#"><b>{this.joinWithAndEnd(currentUsers)}</b></a></span>
                            <span> {iWe}  {amAre} looking for a </span>
                            <span>boardgame </span>
                            <span className="topselect">
                                <span>that plays in </span>
                                <Dropdown
                                    inline={true}
                                    placeholder="any time"
                                    data-testid="PlaytimeDropdown"
                                    options={timeOptions}
                                    closeOnChange={true}
                                    onChange={(_e, d) => this.onTimeChange(d.value as number)} />
                            </span>
                        </span>

                        <span className="topselect">
                            <span>with </span>
                            <Dropdown
                                inline={true}
                                placeholder="any number of players"
                                data-testid="PlayercountDropdown"
                                options={playercountOptions}
                                closeOnChange={true}
                                onChange={(_e, d) => this.onPlayerCountChange(d.value as number)} />
                        </span>

                        <span className="topselect">
                            <span>and {iWe} prefer games that </span>
                            <Dropdown
                                inline={true}
                                placeholder={sortingOptions[0].text}
                                data-testid="SortOptionDropdown"
                                options={this.getSortOptions()}
                                multiple={allowMultiSelect}
                                closeOnChange={!allowMultiSelect}
                                value={values}
                                onChange={(_e, d) => this.onSortChange(d.value as number[])} />
                        </span>
                    </div>
                </div>
            </Container>
        );
    }
}

// --- GameListItem ---

type Size = "mini" | "tiny" | "small" | "medium" | "large" | "big" | "huge" | "massive";

export interface GameListItemProps {
    item: GameInfoPlus;
    size?: Size;
}

const gameDescription = new DescriptionGenerator();

/**
 * PureComponent that renders  a given GameInfo item into a list like view.
 */
export class GameListItem extends React.PureComponent<GameListItemProps> {

    render() {
        const { item, size } = this.props;
        const { owners = [] } = item;
        return (
            <Item >
                <Item.Image size={size}><img data-testid="GameImage" src={item.imageUrl} /></Item.Image>
                <Item.Content verticalAlign={"middle"}>
                    <Item.Header data-testid="GameName" href={"https://boardgamegeek.com/boardgame/" + item.id} as="a" size={size} target="_blank">{item.name}</Item.Header>
                    <Item.Meta data-testid="GameYear">
                        <span>{item.yearPublished}</span>
                        {item.owners && <span data-testid="Owners"> - <span>{owners.join(", ")}</span></span>}

                    </Item.Meta >
                    <Item.Description data-testid="GameDescription">
                        {gameDescription.generateDescription(item)}
                    </Item.Description>
                    {("categories" in item) && <Item.Extra>{item.categories.join(", ")}</Item.Extra>}
                </Item.Content>
            </Item>
        );
    }
}

// --- GameCardItem ---

interface GameCardItemProps {
    item: GameInfoPlus;
    size?: Size;
}

/**
 * PureComponent that renders a given GameInfo item into a card view.
 */
class GameCardItem extends React.PureComponent<GameCardItemProps> {
    render() {
        const { item, size } = this.props;
        const { owners = [] } = item;
        return (
            <Card size={size}>
                <Image src={item.imageUrl} size={"massive"} wrapped ui={false} />
                <Card.Content>
                    <Card.Header>{item.name}</Card.Header>
                    <Card.Meta>
                        <span className="date">{(item.yearPublished || "") + " - " + owners.join(", ")}</span>
                    </Card.Meta>
                    <Card.Description>
                        {gameDescription.generateDescription(item)}
                    </Card.Description>
                </Card.Content>
                <Card.Content extra>
                    {("categories" in item) && item.categories && item.categories.join(", ")}
                </Card.Content>
            </Card>
        );
    }
}

// --- PickAGameForMe ---

interface PickAGameProps {
    games: GameInfoPlus[];
}

interface PickAGameState {
    pickedGame?: GameInfoPlus;
    gamesAlreadyShown: GameInfoPlus[];
}

const pickAGameInitialState = {
    pickedGame: undefined,
    gamesAlreadyShown: []
};

class PickAGameForMe extends React.Component<PickAGameProps, PickAGameState> {

    constructor(props: PickAGameProps) {
        super(props);
        this.state = pickAGameInitialState;
        this.pickARandomGame = this.pickARandomGame.bind(this);
        this.close = this.close.bind(this);
    }

    pickARandomGame() {
        const games = this.props.games;
        let gamesAlreadyShown = [...this.state.gamesAlreadyShown];
        let gamesToPickFrom = games.filter((gameToPossiblyPickFrom) => gamesAlreadyShown.every((alreadyShownGame) => alreadyShownGame.id !== gameToPossiblyPickFrom.id));
        if (gamesToPickFrom.length === 0) {
            gamesAlreadyShown = [];
            gamesToPickFrom = games;
        }
        const randomIndexDice = new Array(3).fill(0).map(() => this.randomInteger(0, gamesToPickFrom.length - 1));
        const randomIndex = randomIndexDice.reduce((p, c) => Math.min(p, c), Math.ceil((gamesToPickFrom.length - 1) / 2));
        const pickedGame = gamesToPickFrom[randomIndex];
        gamesAlreadyShown.push(pickedGame);
        this.setState({
            pickedGame: pickedGame,
            gamesAlreadyShown: gamesAlreadyShown
        });
    }

    randomInteger(from: number, to: number): number {
        return Math.floor(Math.random() * to) + from;
    }

    close() {
        this.setState(pickAGameInitialState);
    }

    render() {
        const pickedGame = this.state.pickedGame;
        if (pickedGame) {
            return (
                <Dimmer inverted active={true} onClick={this.close}>
                    <Container >
                        <Segment>
                            <Header as="h3">What about this game?</Header>
                            <Item.Group >
                                <GameListItem size={"large"} item={pickedGame} />
                            </Item.Group>
                            <Button className="large" color="black" onClick={(e) => {
                                e.stopPropagation();
                                this.pickARandomGame();
                            }} >
                                <Icon name="cube" />Find another
                            </Button>
                        </Segment>
                    </Container>

                </Dimmer >
            );
        } else {
            return (
                <Container text >
                    <Button fluid basic onClick={(e) => {
                        e.stopPropagation();
                        this.pickARandomGame();
                    }}>
                        <Icon name="cube" />Pick a game for me!
            </Button>
                </Container>
            );
        }
    }
}

// --- CollectionList ---

interface CollectionListProps {
    games: GameInfoPlus[];
}

class CollectionList extends React.PureComponent<CollectionListProps> {
    render() {
        const { games } = this.props;
        return (
            <Item.Group>
                {games.map((game) => <GameListItem key={game.id} item={game} />)}
            </Item.Group>
        );
    }
}

// --- CollectionGrid ---

interface CollectionGridProps {
    games: GameInfoPlus[];
}

class CollectionGrid extends React.PureComponent<CollectionGridProps> {
    render() {
        const { games } = this.props;
        return (
            <Card.Group centered  >
                {games.map((game) => <GameCardItem key={game.id} item={game} />)}
            </Card.Group>
        );
    }
}


// --- Helper Components ---

class NoGamesFound extends React.PureComponent<Record<string, never>> {
    render() {
        return (
            <Header as="h2" icon textAlign="center" data-testid="nogames">
                <Icon name="frown" circular />
                <Header.Content>
                    <span >Sorry, I could not find any games that match what you are looking for.</span>
                </Header.Content>
            </Header>
        );
    }
}

class Footer extends React.PureComponent<Record<string, never>> {
    render() {
        return (
            <Container text className="Footer">
                <Divider />
                <List horizontal>
                    <List.Item>
                        <Header className="faded" as="h5">
                            <a href="about.html">About Cardboard Butler </a>
                        </Header >
                    </List.Item>
                    <List.Item>
                        <Header className="faded" as="h5">
                            <a href="https://github.com/PhilipK/CardboardButler">Github Page</a>
                        </Header >
                    </List.Item>
                    <List.Item>
                        <Header className="faded" as="h5">
                            <a href="https://boardgamegeek.com/support">Support BGG</a>
                        </Header >
                    </List.Item>
                </List>
                <Divider hidden />
            </Container>
        );
    }
}

// --- Main Component: CollectionPage ---

type ViewType = "grid" | "list";

interface Props {
    games?: GameInfoPlus[];
    currentUsers?: string[];
}

interface State {
    filterOptions: FilterAndSortOptions;
    viewType: ViewType;
}

export default class CollectionPage extends React.Component<Props, State> {
    private filterer = new GamesFilterAndSorter();

    constructor(props: Props) {
        super(props);
        this.onFilterChange = this.onFilterChange.bind(this);
        this.onSetViewType = this.onSetViewType.bind(this);
        this.state = { filterOptions: {}, viewType: "list" };
    }

    onFilterChange(filterOptions: FilterAndSortOptions) {
        this.setState({
            filterOptions: filterOptions
        });
    }

    onSetViewType(viewType: ViewType) {
        this.setState({
            viewType: viewType
        });
    }

    render() {
        const { games = [], currentUsers = [] } = this.props;
        const { viewType } = this.state;
        const filteredGames = this.filterer.filterAndSort(games, this.state.filterOptions);
        const noGames = filteredGames.length === 0;
        return (
            <div data-testid="CollectionPage">
                <div style={{ position: "absolute", top: 20, right: 20 }}>
                    <Icon size="small" inverted={viewType === "list"} bordered circular name="list" onClick={() => this.onSetViewType("list")} />
                    <Icon size="small" inverted={viewType === "grid"} bordered circular name="grid layout" onClick={() => this.onSetViewType("grid")} />
                </div>
                <Container fluid textAlign="center" className="logoHeader">
                    <Header as="h1">
                        <span className="logoscript">Cardboard Butler</span>
                    </Header>
                </Container>
                <FilterBar onFilterChange={this.onFilterChange} currentUsers={currentUsers} />

                {noGames && <NoGamesFound />}

                {filteredGames.length > 0 && <Container text fluid>
                    <PickAGameForMe games={filteredGames} />
                    <Divider hidden />
                </Container>
                }
                <Container fluid text={viewType === "list"}>
                    {viewType === "list" &&
                        <CollectionList games={filteredGames} />
                    }
                    {viewType === "grid" &&
                        <CollectionGrid games={filteredGames} />
                    }
                </Container>
                <Footer />

            </div>
        );
    }
}
