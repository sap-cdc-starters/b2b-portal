import { useEffect } from "react";
import {ActionTypes, ActorRef, AnyEventObject, AnyState } from "xstate";
import {AppMachine} from "../machines/appMachine";
import {NotificationResponseItem, NotificationsEvents} from "../machines/notificationsMachine";
import { omit } from "lodash/fp";

export function isUpdateType(state: AnyState) {
    return state.event?.type &&
        state.event.type.toLowerCase() === "xstate.update";
}
function generateUniqueID() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return '_' + Math.random().toString(36).substr(2, 9);
}


function getPayload(event: AnyEventObject) {
    return {
        ...omit(['type', 'data', 'service', 'loader'], event),
        ...(event.data || {})

    };
}

function doneDetails(event: AnyEventObject): Partial<NotificationResponseItem> {
    if (event.type.indexOf('DONE.') > 0) {
        const title = `done: ${event.type.replace('DONE.INVOKE.', '').replace(':INVOCATION[0]', '')}`
        return {
            severity: 'success',
            title

        }
    }
    return {};
}


function errorDetails(event: AnyEventObject): Partial<NotificationResponseItem> {
    if (event.type.indexOf('ERROR.') > 0) {
        const title = `${event.type.toLowerCase()
            .replace(ActionTypes.ErrorCommunication, 'communication error: ')
            .replace(ActionTypes.ErrorExecution, 'execution error: ')
            .replace(ActionTypes.ErrorCustom, 'error: ')

            .replace(':invocation[0]', '')} `;
        return {
            severity: 'error',
            title

        }
    }
    return {};
}



export function useAppLogger(app: ActorRef<AppMachine>, send: (notification: NotificationsEvents) => {}) {
    useEffect(() => {
        if(app){
            const subscriptions =
                subscribeApp(app, send);
            return () => subscriptions && subscriptions.unsubscribe();

        }
        else {
            return () => {};

        }
    }, [app]);

    return true;

    function subscribeApp(app: ActorRef<AppMachine>, send: (notification: NotificationsEvents) => {}) {
        return app?.subscribe && app.subscribe((state: AnyState) => {
            if (!state || isUpdateType(state)) return;
            console.log(state);

            send({
                type: "ADD", notification: {
                    id: generateUniqueID(),
                    title: `${state.value.toString().toLowerCase()}`,
                    severity: 'success',
                    group: `${state.context.app.name}`,
                    icon: state.context.app?.logo || 'manage_accounts' ,
                    summary: `assets: ${state.context.assets?.length || '0'}`,
                    payload: getPayload(state.event),
                    ...doneDetails(state.event),
                    ...errorDetails(state.event)
                }
            })

        });
    }


}