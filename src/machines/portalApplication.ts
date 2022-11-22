import {AnyRecord, PortalApplication} from "../models";
import {AppMachine, appModel, Assets} from "./appMachine";
import {GigyaSdk} from "../gigya/gigyaLoadMachine";
import {gigyaAppMachine} from "./gigyaAppMachine";
import { ActorRef, spawn } from "xstate";
export   type PortalApplicationRef = PortalApplication & {
    machine: ActorRef<AppMachine>
}
// export   type PortalApplicationRef =   PortalApplication & ActorRef<AppMachine>;



function appWithRole(app: AppMachine) {
    return app.withConfig({
        actions: {
            // assignAssets: appModel.assign({
            //     assets: (_: any, ev: Assets) => toApps(ev.assets),
            // }),
            onAssets: appModel.assign({
                roles: (ctx: { assets: Assets, service: GigyaSdk }, ev: any) =>
                    toFn(ctx.assets)
                ,
            })
        }
    });
}

/*function getWithContext(app) {
    return appMachine.withContext(
        {
            ...appMachine.context,
            app: app,
            id: app.id
        }
    );
}*/

function addLogo(service: GigyaSdk) {
    return (app:PortalApplication)=>{
        return {
            ...app,
            logo: service.config[app.name]?.icon || service.config[app.name.replace("_", " ")]?.icon
        
    }}
    
}

export function portalApplicationMachine(app: AppMachine): AppMachine {
    return app.withConfig({
        actions: {
            onAssets: appModel.assign({
                apps: (ctx: { assets: Assets, service: GigyaSdk }, ev: any) =>
                    toApps(ctx.assets)
                        .map(addLogo(ctx.service))
                        .map(app => {
                            return { 
                                machine:spawn(appWithRole(gigyaAppMachine(app, ctx.service)), {sync: true, name:app.name}),
                                ...app
                            } ;
                            
                        })

                ,
            })
        }
    })

}

type ArrayOrValue<T> = T | Iterable<T>;

function toApps(assets: {
    type: string, path: string, attributes: {
        icon?: ArrayOrValue<string> | undefined,
        App: ArrayOrValue<string>,
        info?: ArrayOrValue<string> | undefined
    } & AnyRecord
}[]): PortalApplication[] {

    return assets.filter(a => a.type === 'Portal Applications').map(e => {

        return {name: e.path, id: firstOrValue(e.attributes.App), icon: firstOrValue(e.attributes.icon)}

    })
}

function toFn(assets: {
    type: string, path: string, attributes: AnyRecord
}[]): { type: string, role: string }[] {
    return assets.filter(a => a.type.endsWith('Role')).map(e => {
        return {role: e.path, type: e.type}

    })
}

function firstOrValue<T>(value: ArrayOrValue<T>): T {
    return value instanceof Array<T> ? value[0] : value;
}