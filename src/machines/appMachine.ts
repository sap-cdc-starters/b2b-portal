import {Machine, assign, InterpreterFrom, actions, ContextFrom, EventFrom, send} from "xstate";
import {User, IdToken, PortalApplication} from "../models";

const {log} = actions;


import {createModel} from "xstate/lib/model"
import Apps from "../components/Apps";

declare type AnyRecord = {
    [key: string]: any
}
declare type Error = AnyRecord | any;
export declare type Assets = AnyRecord[] | any;

export const appModel = createModel(
    {
        id: undefined as string | undefined,
        assets: undefined as Assets | undefined,
        action: undefined as string | undefined,
        error: undefined as Error | undefined,
        service: undefined as any | undefined,
        ["index" as string]: undefined as any | undefined
    },
    {
        events: {
            'FETCH': () => ({}),
            'FOUND': (assets: AnyRecord[]) => ({assets}),
            'ERROR': (error: Error) => ({error}),
            'OPEN': () => ({}),

        },
    }
)
export const appMachine = appModel.createMachine(
    {
        predictableActionArguments: true,
        id: "appStateMachine",
        context: appModel.initialContext,
        initial: "fetchAssets",

        on: {
            "FETCH": {
                target: "fetchAssets",

            },
        },
        states:
            {
                fetchAssets: {
                    invoke: {
                        id: "authMachine-fetchAssets",
                        src: "fetchAssets",
                        data: {
                            appId: (ctx: { id: string }) => ctx.id
                        }
                    },
                    on: {
                        "FOUND": {
                            target: "withAssets",
                            actions: ['assignAssets'],
                        },
                        "ERROR": {
                            target: "noAssets",
                            actions: [
                                appModel.assign({
                                    error: (_: any, ev: { error: Error }) => ev.error,
                                }),
                            ],
                        },

                    },
                },

                withAssets: {
                    entry: ['onAssets']
                },
                noAssets: {
                    entry: ['onNoAssets']
                }
            }

    },{
        actions:{
            assignAssets:
                appModel.assign({
                    assets: (_:any, ev:Assets) => ev.assets,
                })
        }
    }
)


export type AppMachine = typeof appMachine;
export type AppMachineContext = ContextFrom<AppMachine>;
// export type AuthMachineContext =typeof appModel.initialContext;
export type AppMachineEvents = EventFrom<AppMachine>;

export type AppService = InterpreterFrom<AppMachine>;
