import * as React from "react";
import BggGameService from "../services/BggGameService";
import { GameInfoPlus } from "../types";
import CollectionPage from "./CollectionPage";
import BggGameLoader, { LoadingInfo, PlaysLoadingInfo, CollectionMerger } from "../services/BggGameLoader";
import { Dimmer, Loader, Progress, Header, Message } from "semantic-ui-react";
import ValidatingUserInput from "./ValidatingUserInput";

// --- WelcomePage Component ---

interface WelcomePageProps {
    onNameSelect: (names: string[]) => any;
    userValidator: (name: string) => Promise<boolean>;
    showWarning?: boolean;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ userValidator, onNameSelect, showWarning }) => {
    return (
        <div className="ui middle aligned center aligned grid givenames" data-testid="WelcomePage">
            <div className="column">
                <div>
                    <Header as="h3">
                        <span>Good day, how can I help you today?</span>
                    </Header>
                </div>
                <div className="ui large form" >
                    <div className="ui">
                        <ValidatingUserInput
                            userValidator={userValidator}
                            onNameSelect={onNameSelect}
                        />
                    </div>
                </div>
                {showWarning && <Message>
                    <Message.Header>BGG is taking a breather</Message.Header>
                    <p>
                        Boardgame Geek has a limit on how many requests I can make.
                        Unfortunatly the limit has been hit for a while, so try agian in a couple of minutes (or 10).
                    </p>
                </Message>}
            </div>
        </div>
    );
};

const MemoizedWelcomePage = React.memo(WelcomePage);

// --- App Component ---

export interface AppProps {
    bggServce?: BggGameService;
}


export interface AppState {
    names: string[];
    games: GameInfoPlus[];
    loadingInfo: LoadingInfo[];
    showingCollection: boolean;
    showBackoff: boolean;
}

const initialState: AppState = { names: [], games: [], loadingInfo: [], showingCollection: false, showBackoff: false };


export default class App extends React.Component<AppProps, AppState> {

    private collectionMerger: CollectionMerger;
    private readonly loader: BggGameLoader;

    constructor(superProps: Readonly<AppProps>) {
        super(superProps);
        this.collectionMerger = new CollectionMerger();

        this.onNameSelect = this.onNameSelect.bind(this);
        this.userValidator = this.userValidator.bind(this);
        this.handleHashChange = this.handleHashChange.bind(this);
        const bggService = superProps.bggServce || new BggGameService();
        this.loader = new BggGameLoader(bggService, this.collectionMerger, true);
        this.loader.onGamesUpdate((games) => {
            if (this._ismounted) {
                this.setState({ games: games, showingCollection: true });
            }
        });
        this.loader.onLoadUpdate((loadinfo) => {
            if (this._ismounted) {
                this.setState({ loadingInfo: loadinfo });
            }
        });
        this.state = initialState;
        window.addEventListener("hashchange", this.handleHashChange, false);
    }

    private _ismounted: boolean;


    componentDidMount() {
        this._ismounted = true;
        this.handleHashChange();
    }

    handleHashChange() {
        const hashValue = window.location.hash.substr(0);
        if (hashValue && hashValue !== "" && hashValue.indexOf("usernames=") > -1) {
            const usernames = hashValue.substring("usernames=".length + 1).split(",");
            this.onNameSelect(usernames);
        } else {
            this.setState(initialState);
        }
    }

    componentWillUnmount() {
        window.removeEventListener("hashchange", this.handleHashChange, false);
        this._ismounted = false;
    }

    getBggService() {
        return this.props.bggServce || new BggGameService();
    }


    onNameSelect(newNames: string[]) {
        if (newNames.join(",") !== this.state.names.join(",")) {
            this.setState({
                names: newNames
            });
            window.location.hash = "usernames=" + newNames.join(",");
            if (this._ismounted) {
                this.loader.loadCollections(newNames).then(() => {
                    this.loader.loadExtendedInfo().then(() => {
                        this.loader.loadPlays();
                    });
                });
            }
        }
    }


    async userValidator(name: string) {
        const res = await this.getBggService().getUserInfo(name);
        const beingToldToBackOff = res.isValid === "unknown" && res.error === "backoff";
        if (beingToldToBackOff) {
            this.setState({ showBackoff: true });
            return false;
        } else {
            const allGoodAgain = res.isValid === true;
            if (allGoodAgain) {
                this.setState({ showBackoff: false });
            }
            return allGoodAgain;
        }
    }

    render() {
        const { loadingInfo = [], games, showingCollection, names, showBackoff } = this.state;
        const loadingCollections = loadingInfo.filter((li) => li.type === "collection").map((c) => c.type === "collection" ? c.username : "");
        const isLoadingCollections = loadingCollections.length > 0;
        const loadingGames = loadingInfo.filter((li) => li.type === "game");
        const loadingPlays = loadingInfo.filter((li) => li.type === "plays") as PlaysLoadingInfo[];
        const progressStyle: React.CSSProperties = { position: "fixed", borderRadius: 30, bottom: 0, height: 120, left: "20%", right: "20%", padding: 40, backgroundColor: "white" };
        return (
            <span >
                {!showingCollection && !isLoadingCollections && <MemoizedWelcomePage onNameSelect={this.onNameSelect} userValidator={this.userValidator} showWarning={showBackoff} />}
                {isLoadingCollections && games.length === 0 && <Dimmer active inverted>
                    <Loader inverted content={"Finding games for " + loadingCollections.join(", ")} />
                </Dimmer>
                }

                {games.length > 0 && showingCollection && <CollectionPage currentUsers={this.state.names} games={games} />}
                {isLoadingCollections && games.length > 0 &&
                    <div style={progressStyle}>
                        <Loader active inline="centered" content={"Finding games for " + loadingCollections.join(", ")} />
                    </div>
                }
                {games.length > 0 && loadingGames.length > 0 &&
                    < div style={progressStyle}>
                        <Progress indicating value={games.length - loadingGames.length} total={games.length} progress="ratio">
                            Getting more game info
                    </Progress>
                    </div>
                }

                {games.length > 0 && loadingPlays.length > 0 &&
                    < div style={progressStyle}>
                        <Progress indicating value={names.length - loadingPlays.length} total={names.length} progress="ratio">
                            Finding plays for {loadingPlays.map((lp) => lp.username).join(", ")}
                        </Progress>
                    </div>
                }

            </span>
        );
    }
}
