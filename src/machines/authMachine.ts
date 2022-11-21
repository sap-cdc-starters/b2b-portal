import {Machine, assign, InterpreterFrom, actions, ContextFrom, EventFrom, send} from "xstate";
import {User, IdToken} from "../models";

const {log} = actions;


export interface SocialPayload {
    provider: string,

    [key: string]: any
}

import {createModel} from "xstate/lib/model"
import {Account} from "../gigya/models";

export interface Token {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
}

declare type AnyRecord = {
    [key: string]: any
}

declare type Error = AnyRecord | any;

export const authModel = createModel(
    {
        user: undefined as User | undefined,
        assets: undefined as AnyRecord[] | undefined,
        token: undefined as Token | undefined,
        service: undefined as any | undefined,
        container: 'container',
        loader: undefined as any | undefined,
        error: undefined as Error | undefined,
        organizations: undefined as AnyRecord[] | undefined
    },
    {
        events: {
            LOGGED_IN: (user: User) => ({user}),
            LOGGED_OUT: () => ({}),
            ACCOUNT: (user: User) => ({user}),
            ACCOUNT_MISSING: () => ({}),
            LOGIN: (containerID: string) => ({containerID}),
            LOGOUT: (containerID: string) => ({containerID}),
            LOADED: (service: any) => ({service}),
            'ORGANIZATION.REGISTER': (containerID?: string, prefix?: string) => ({containerID, prefix}),
            'ORGANIZATION.REGISTER.SUCCESS': (organization: AnyRecord) => ({organization}),
            'ORGANIZATION.REGISTER.ERROR': (error: AnyRecord | any) => ({error}),
            'FETCH_ASSETS': (appId?: string) => ({appId}),
            'FETCH.ASSETS.SUCCESS': (assets: AnyRecord[] | any) => ({assets}),
            'FETCH.ASSETS.ERROR': (error: AnyRecord | any) => ({error}),
            'FETCH.ORGANIZATION': (organizations: AnyRecord[] | any) => ({organizations}),
            'ORGANIZATION.FOUND': (organizations: AnyRecord | any) => ({organizations}),
            'FETCH.ORGANIZATION.ERROR': (error: AnyRecord | any) => ({error}),

        },
    }
)
export const authMachine = authModel.createMachine(
    {
        predictableActionArguments: true,
        id: "authStateMachine",
        context: authModel.initialContext,
        initial: "loading",
        on: {
            'ORGANIZATION.REGISTER': {
                target: 'organization'
            },
            LOGIN: {
                target: "login"
            },
            LOGGED_IN: {
                target: "checkingAccount",
                actions: [
                    authModel.assign({
                        user: (_, ev) => ev.type == "LOGGED_IN" && ev.user,
                    }),
                ],
            },
            LOGGED_OUT: {
                target: "loggedOut",
                actions: [
                    authModel.assign({
                        user: undefined,
                    }),
                ],
            },

        },
        states: {
            loading: {
                invoke: {
                    id: "loader",
                    src: 'loader',
                    onDone: [{
                        target: "checkingAccount",
                        actions: ['assignServiceFromData'],
                    }]
                },
                on: {
                    LOADED: {
                        target: "checkingAccount",
                        actions: ['assignService'
                        ],
                    }
                }
            },

            organization: {
                invoke: {
                    id: "organization-register",
                    src: 'registerOrganization',

                },
                on: {
                    "ORGANIZATION.REGISTER.SUCCESS": {
                        target: 'checkingAccount'
                    },
                    "ORGANIZATION.REGISTER.ERROR": {
                        actions: ['assignError']
                    }
                },

            },
            checkingAccount: {
                invoke: {
                    id: "authMachine-fetch",
                    src: "fetchAccount",
                },
                on: {
                    ACCOUNT: {
                        target: "loggedIn",
                        actions: [
                            authModel.assign({
                                user: (_, ev) => ev.user,
                            }),
                        ],
                    },
                    ACCOUNT_MISSING: {
                        target: 'loggedOut',
                        actions: [
                            authModel.assign({
                                user: undefined,
                            })


                        ],
                    },
                },
            },

            loggedIn: {
                entry: 'loggedInEntry',
                on: {
                    "FETCH.ORGANIZATION": {
                        target: '.fetchOrganization'
                    },
                    "ORGANIZATION.FOUND": {
                        target: ".withOrganization",
                        actions: [
                            authModel.assign({
                                organizations: (_, ev) => ev.organizations,
                            }),
                        ],
                    },
                    LOGOUT: {
                        target: 'logout'
                    }
                },
                states:
                    {
                        fetchOrganization: {
                            invoke: {
                                id: "authMachine-fetchOrganization",
                                src: "organizationProvider",
                            },
                            on: {
                                "ORGANIZATION.FOUND": {
                                    target: "withOrganization",
                                    actions: [
                                        authModel.assign({
                                            organizations: (_, ev) => ev.organizations,
                                        }),
                                    ],
                                },
                                "FETCH.ORGANIZATION.ERROR": {
                                    target: 'noOrganization',
                                    actions: [
                                        authModel.assign({
                                            organizations: (_, ev) => [],
                                            error: (_: any, ev: { error: Error }) => ev.error
                                        }),


                                    ],
                                },
                            },
                        },
                        withOrganization: {
                            entry: "organizationEntry",
                            on: {
                                "FETCH_ASSETS": {
                                    target: 'fetchAssets'
                                }


                            }},
                        noOrganization: {},

                        fetchAssets: {
                            invoke: {
                                id: "authMachine-fetchAssets",
                                src: "fetchAssets",
                            },
                            on: {
                                "FETCH.ASSETS.SUCCESS": {
                                    target: "withAssets",
                                    actions: [
                                        authModel.assign({
                                            assets: (_, ev) => ev.assets,
                                        }),
                                    ],
                                },
                                "FETCH.ASSETS.ERROR": {
                                    target: "noAssets",
                                    actions: [
                                        authModel.assign({
                                            error: (_: any, ev: any) => ev.error,
                                            assets: (_, ev) => [],
                                        }),
                                    ],
                                },

                            },
                        },
                      
                        withAssets: {},
                        noAssets: {}
                    },


            },
            loggedOut: {

                entry: [
                    authModel.assign({
                        user: (_, ev) => undefined,
                    }),
                    send({
                        type: "LOGIN",


                    })]
            },
            login: {
                invoke: {
                    id: "authMachine-login",
                    src: "showLogin",


                },

            },
            logout: {
                invoke: {
                    id: "authMachine-logout",
                    src: "logout",


                },

            }
        },
    },
    {
        actions: {
            assignService: authModel.assign({
                service: (_: any, ev: { type: "LOADED", service: any; }) => ev.service
            }),
            assignServiceFromData: authModel.assign({
                service: (_: any, ev: { data: { service: any; }; }) => ev.data.service
            }),
            assignError: authModel.assign({
                error: (_: any, ev: { error: any; }) => ev.error
            }),
        }
    }
)


export type AuthMachine = typeof authMachine;
export type AuthMachineContext = ContextFrom<AuthMachine>;
// export type AuthMachineContext =typeof authModel.initialContext;
export type AuthMachineEvents = EventFrom<AuthMachine>;

export type AuthService = InterpreterFrom<AuthMachine>;
