import {getAccount, getApps} from "../gigya/gigyaAuthService";
import {omit} from "lodash/fp";
import {AuthMachine, authModel} from "./authMachine";
import {gigyaService, loader} from "../gigya/gigyaLoadMachine";


export const withGigya = (authMachine: AuthMachine) => authMachine.withContext({
    ...authMachine.context,
    loader: loader
}).withConfig({
    services: {
        loader: (context, event) => loader,
        registerOrganization: (ctx, event) => (send) => {
            const payload = omit("type", event);
            const context = omit("service", ctx);
            const show = async (payload: any) => {
                try{
                    const response=await ctx.service.showScreenSetAsync(payload);
                    send({type: "ORGANIZATION.REGISTER.SUCCESS", organization:response});

                }
                catch (e) {
                    send({type: "ORGANIZATION.REGISTER.ERROR", error:e});
                }
            }
            // @ts-ignore
            return show({containerID: context.container,screenSet: `${event.prefix || 'Default'}-OrganizationRegistration` , ...payload})                ;
        },
        showLogin: (ctx, event) => {
            const payload = omit("type", event);
            const context = omit("service", ctx);
            const show = async (payload: any) => {
                const user = await ctx.service.showLoginScreenSet(payload);
                return {user: {...(user?.userInfo || {}), photo: user?.profile?.photoURL}};
            }
            ctx.service && show({containerID: context.container, ...payload});
            return ctx.service.$login;
        },
        fetchAccount: (ctx, event) => (send) => {
            const payload = omit("type", event);
            return getAccountAsync(payload)
                .then(function ({user}) {

                    send({type: "ACCOUNT", user})
                })
                .catch(function (err) {
                    send("ACCOUNT_MISSING")
                })
        },
        logout: (ctx, event) => (send) => {
            ctx.service.logout({callback: () => send({type: "LOGGED_OUT"})})
               
        },
    },

    actions: {
        assignService: authModel.assign({
            service: (_: any, ev: { type: "LOADED", service: any; }) => ev.service
        })
    }
});

async function getAccountAsync(payload: any) {
    const account = await getAccount(payload);
    const apps = await getApps(gigyaService.state?.context?.config?.app);

    const user = {...account, ...(account?.profile || {}), photo: account?.profile?.photoURL, apps};

    return {apps, user}
}

function decodeJwt(token?: string) {

    return token && token.split && JSON.parse(atob(token.split('.')[1]));

}

