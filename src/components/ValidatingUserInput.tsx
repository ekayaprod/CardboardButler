import * as React from "react";
import { Header, Input, Icon } from "semantic-ui-react";

interface SelectUserInputProps {
    bggNames?: string[];
    onNameChange?: (newNames: string[]) => any;
    validNames?: string[];
    loadingNames?: string[];
    onNameSelect?: (names: string[]) => any;
}


/**
 * PureComponent that renders  a given GameInfo item into a list like view.
 */
export class SelectUserInput extends React.PureComponent<SelectUserInputProps> {

    constructor(props: SelectUserInputProps) {
        super(props);
        this.onInputChange = this.onInputChange.bind(this);
        this.getNamesToShow = this.getNamesToShow.bind(this);
        this.onAddClick = this.onAddClick.bind(this);
        this.onDeleteClick = this.onDeleteClick.bind(this);
        this.onUseClick = this.onUseClick.bind(this);
    }

    onInputChange(value: string, index: number) {
        if (this.props.onNameChange) {
            const bggNames = this.props.bggNames || [];
            const clone = [...bggNames];
            clone[index] = value;
            this.props.onNameChange(clone);
        }
    }

    onAddClick() {
        if (this.props.onNameChange) {
            const newNamesToShow = this.getNamesToShow().concat([""]);
            this.props.onNameChange(newNamesToShow);
        }
    }

    onDeleteClick(index: number) {
        if (this.props.onNameChange && this.props.bggNames) {
            const clone = [...this.props.bggNames];
            clone.splice(index, 1);
            this.props.onNameChange(clone);
        }
    }

    getNamesToShow() {
        const { bggNames } = this.props;
        const namesToShow = (bggNames === undefined || bggNames.length === 0) ? [""] : [...bggNames];
        return namesToShow;

    }

    onUseClick() {
        const { onNameSelect } = this.props;
        if (onNameSelect) {
            const names = this.props.bggNames;
            const trimmedNames = names.map((name) => name.trim());
            onNameSelect(trimmedNames);
        }
    }

    render() {
        const namesToShow = this.getNamesToShow();
        const showDelete = namesToShow.length > 1;
        const { validNames = [], loadingNames = [] } = this.props;
        const hasEnoughNames = namesToShow.length > 0 && namesToShow[0] !== "";
        const forwardButtonText = `Can you help ${namesToShow.length === 1 ? "me" : "us"} find a game to play?`;
        const canUseNames = hasEnoughNames && namesToShow.every((name) => validNames.indexOf(name) > -1);
        return (
            <div >
                {
                    namesToShow.map((name, i) => {
                        const isValid = validNames.indexOf(name) > -1;
                        const isLoading = loadingNames.indexOf(name) > -1;
                        const isLast = i === namesToShow.length - 1;
                        const inputName = "Input" + i;
                        const isValidLabel = isValid ? { icon: "check", "data-testid": inputName + "Valid" } : null;
                        const removeButton = showDelete ? (
                            <Icon
                                data-testid={inputName + "Delete"}
                                style={{ cursor: "pointer" }}
                                name="remove"
                                className="link"
                                onClick={() => this.onDeleteClick(i)}
                            />) : null;

                        return <div key={inputName} className="field">
                            <Input
                                labelPosition="left corner"
                                placeholder="BGG Username"
                                label={isValidLabel}
                                input={{
                                    "data-testid": inputName
                                }
                                }
                                icon={removeButton}
                                loading={isLoading}
                                value={name}
                                data-testid={isLoading ? inputName + "Loading" : null}
                                type="text"
                                autoFocus={isLast}
                                onChange={(e) => this.onInputChange(e.target.value, i)} />
                        </div>;
                    }
                    )
                }
                <div className="field">
                    <button data-testid="AddButton" onClick={() => this.onAddClick()} className="ui basic button tiny">
                        <i className="icon plus"></i>
                        Add a friend
                </button>
                </div>
                <div className="field">
                    <button data-testid="UseNames"
                        disabled={!canUseNames}
                        onClick={this.onUseClick} className="ui basic button large">
                        {forwardButtonText}
                    </button>
                </div>
            </div >
        );
    }
}


interface Props {
    // can ask this if user is valid or not
    userValidator?: (name: string) => Promise<boolean>;
    onNameSelect?: (names: string[]) => any;
}

interface State {
    shownNames: string[];
    validNames: string[];
    invalidNames: string[];
    loadingNames: string[];

}


const initialState: State = {
    shownNames: [],
    validNames: [],
    invalidNames: [],
    loadingNames: [],
};


export default class ValidatingUserInput extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.onNamesChange = this.onNamesChange.bind(this);
        this.state = initialState;
        this.doesNameNeedValidation = this.doesNameNeedValidation.bind(this);
        this.isNameShown = this.isNameShown.bind(this);
        this.setNameLoading = this.setNameLoading.bind(this);
        this.setNameValidity = this.setNameValidity.bind(this);
    }


    private doesNameNeedValidation(name: string): boolean {
        if (name === "" || name === undefined) {
            return false;
        }
        const { validNames, invalidNames, loadingNames } = this.state;
        const { userValidator } = this.props;
        if (!userValidator) {
            return false;
        }
        return !(validNames.indexOf(name) > -1)
            && !(invalidNames.indexOf(name) > -1)
            && !(loadingNames.indexOf(name) > -1);
    }

    private isNameShown(name: string): boolean {
        return this.state.shownNames.indexOf(name) > -1;
    }

    private setNameLoading(name: string, loading: boolean) {
        if (loading) {
            this.setState({
                loadingNames: [...this.state.loadingNames, name]
            });
        } else {
            this.setState({
                loadingNames: this.state.loadingNames.filter((loadingName) => loadingName !== name)
            });
        }
    }

    private setNameValidity(name: string, isValid: boolean) {
        if (isValid) {
            this.setState({
                validNames: [...this.state.validNames, name]
            });
        } else {
            this.setState({
                invalidNames: [...this.state.invalidNames, name]
            });
        }
    }

    private onNamesChange(names: string[]) {
        const { doesNameNeedValidation, isNameShown, setNameValidity, setNameLoading } = this;
        const { userValidator } = this.props;
        this.setState({
            shownNames: names,
        });
        const namesToValidate = names.filter(doesNameNeedValidation);
        namesToValidate.forEach((name) => {
            setTimeout(async () => {
                // things might have changed, so check again if the name is still shown
                if (isNameShown(name) && doesNameNeedValidation(name)) {
                    setNameLoading(name, true);
                    const isValid = await userValidator(name);
                    setNameValidity(name, isValid);
                    setNameLoading(name, false);
                }
                // wait a little with calling validator, to make sure people are done typing.
            }, 300);
        });
    }

    render() {
        const { validNames, shownNames, loadingNames } = this.state;
        const { onNameSelect } = this.props;
        return (
            <div>
                <Header as="h4" style={{ marginTop: "2em" }}>
                    Hi {shownNames.length <= 1 ? "my name is" : "our names are"}
                </Header>
                <SelectUserInput
                    bggNames={shownNames}
                    validNames={validNames}
                    onNameChange={this.onNamesChange}
                    loadingNames={loadingNames}
                    onNameSelect={onNameSelect}
                />
            </div >
        );
    }
}
