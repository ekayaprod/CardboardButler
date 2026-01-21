import * as React from "react";
import { Container, Header, Icon, Divider, List, Item, Card, Image, Button, Dimmer, Segment } from "semantic-ui-react";
import FilterBar from "./FilterBar";
import { FilterAndSortOptions, GameInfoPlus, GameInfo, ExtendedGameInfo } from "../types";
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
        const filterer = new GamesFilterAndSorter();
        const filteredGames = filterer.filterAndSort(games, this.state.filterOptions);
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
