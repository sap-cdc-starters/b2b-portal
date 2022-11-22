import {GigyaSdk} from "../gigya/gigyaLoadMachine";
import {appMachine, AppMachine, appModel, Assets} from "./appMachine";
import {omit} from "lodash/fp";
import {AnyRecord, PortalApplication, User} from "../models";
import {spawn} from "xstate";

export function gigyaAppMachine(app: PortalApplication, { user,  service}:{ user?:User , service: GigyaSdk}): AppMachine {
    return appMachine.withContext({
        id: app.id,
        service: service,
        app: app,
        error: undefined,
        assets: undefined,
        action: undefined
    }).withConfig({
        services: {
            fetchAssets: (ctx, event) => (send) => {
                const payload = omit("type", event);
                return ctx.service.getAssetsAsync({appId: ctx.id, ...payload})
                    .then(function ({allowedAssets}: { allowedAssets: [] }) {
                        if (allowedAssets && allowedAssets.length) {
                            send({type: "FOUND", assets: allowedAssets})
                        }
                    })
                    .catch(function (err: any) {
                        send({type: "ERROR", error: err})
                    })
            }
        }
    });
}

