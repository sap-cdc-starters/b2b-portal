import {getAccount, getApps} from "../gigya/gigyaAuthService";
import {omit} from "lodash/fp";
import {AuthMachine, authModel} from "./authMachine";
import {gigyaService, loader} from "../gigya/gigyaLoadMachine";
import {send} from "xstate";


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
        fetchAssets:(ctx, event) => (send) => {
            const payload = omit("type", event);
            return ctx.service.getAssetsAsync(payload)
                .then(function ({allowedAssets}:any) {
 
                    send({type: "FETCH.ASSETS.SUCCESS", assets:allowedAssets})
                })
                .catch(function (err: any) {
                    send({type:"FETCH.ASSETS.ERROR", error: err})
                })
        },
        fetchAccount: (ctx, event) => (send) => {
            const payload = omit("type", event);
             getAccountAsync({include:"groups,organizations,b2b,all", ...payload})
                .then(function ({user}) { 
                    send({type: "ACCOUNT", user});
                    if(user.organizations){
                        send({type: "ORGANIZATION.FOUND", organizations:user.organizations});

                    }
                })
                .catch(function (err) {
                    send("ACCOUNT_MISSING")
                })
        },
        organizationProvider: (ctx, event) => (send) => {
            const payload = omit("type", event);     
            getAccount({include:"groups,organizations,b2b", ...payload} )
                .then(function (account) {
                    if(account.organizations){
                        send({type: "ORGANIZATION.FOUND", organizations:account.organizations});

                    }
                })
                .catch(function (err) {
                    send({type: "FETCH.ORGANIZATION.ERROR", error:err});
                })
        },
        logout: (ctx, event) => (send) => {
            ctx.service.logout({callback: () => send({type: "LOGGED_OUT"})})
               
        },
    },

    actions: {
        assignService: authModel.assign({
            service: (_: any, ev: { type: "LOADED", service: any; }) => ev.service
        }),
        loggedInEntry:send({type:"FETCH.ORGANIZATION"}),
        organizationEntry:send({type:"FETCH_ASSETS", app:gigyaService.state?.context?.config?.app})
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

