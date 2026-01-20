import * as React from "react";
import ValidatingUserInput from "./ValidatingUserInput";
import { Header, Message } from "semantic-ui-react";

interface Props {
    onNameSelect: (names: string[]) => any;
    userValidator: (name: string) => Promise<boolean>;
    showWarning?: boolean;
}

const WelcomePage: React.FC<Props> = ({ userValidator, onNameSelect, showWarning }) => {
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

export default React.memo(WelcomePage);
