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

export const authModel = createModel(
    {
        user: undefined as User | undefined,
        token: undefined as Token | undefined,
        service: undefined as any | undefined,
        container: 'container',
        loader: undefined as any | undefined,
        error: undefined as any | undefined

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
            ERROR: (error: AnyRecord | any) => ({error}),
            'ORGANIZATION.REGISTER': (containerID?: string, prefix?: string) => ({containerID, prefix}),
            'ORGANIZATION.REGISTER.SUCCESS': (organization: AnyRecord) => ({organization}),
            'ORGANIZATION.REGISTER.ERROR': (error: AnyRecord | any) => ({error}),

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
            ERROR: {
                actions: ["assignError"]
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
                on: {
                    LOGOUT: {
                        target: 'logout'
                    }
                }
            },
            loggedOut: {
                entry: [
                    authModel.assign({
                        user: (_, ev) => undefined
                    })
                ], 
                on: {
                    '': [
                        {
                            cond: 'isInvite', actions: send({
                                type: "LOGIN",
                                screenSet: "Default-RegistrationLogin",
                                startScreen: "invite",
                                ctx: "invite"

                            }), target: "#login"
                        },
                        {
                            cond: 'isSignup', actions: send({
                                type: "LOGIN",
                                screenSet: "Default-RegistrationLogin",
                                ctx: "signup"

                            }), target: "#login"
                        },
                        {
                            cond: 'isLogin', actions: send({
                                type: "LOGIN",
                                screenSet: "Default-RegistrationLogin",
                                startScreen: "gigya-login-screen",
                                ctx: "login"
                            }), target: "#login"
                        }
                    ]
                }


            },
            login: {
                id: "login",
                invoke: {
                    id: "authMachine-signin",
                    src: "showLogin",
                    data: {
                        screenSet: (ctx: any, ev: any) => ev.screenSet || "Default-RegistrationLogin",
                        startScreen: (ctx: any, ev: any, meta:any) => ev.startScreen|| "gigya-login-screen",
                        ctx: (ctx: any, ev: any, meta:any) => ev.ctx||  "default-login",

                    },
                } 
                


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
        },
        guards: {
            isInvite: (_, _ev) => window && window.location.hash == "#invite",
            isSignup: (_, _ev) => window && window.location.hash == "#signup",
            isLogin: (_, _ev) => true

        }
    }
)


export type AuthMachine = typeof authMachine;
export type AuthMachineContext = ContextFrom<AuthMachine>;
// export type AuthMachineContext =typeof authModel.initialContext;
export type AuthMachineEvents = EventFrom<AuthMachine>;

export type AuthService = InterpreterFrom<AuthMachine>;
