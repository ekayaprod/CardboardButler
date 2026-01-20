import FilterBar from "./FilterBar";
import { Container, Header, Icon, Divider, List } from "semantic-ui-react";

import * as React from "react";
import { FilterAndSortOptions } from "../types";
import { GamesFilterAndSorter } from "../services/GamesFilterAndSorter";
import { GameInfoPlus } from "../types";
import PickAGameForMe from "./PickAGame";
import CollectionList from "./CollectionList";
import CollectionGrid from "./CollectionGrid";

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
