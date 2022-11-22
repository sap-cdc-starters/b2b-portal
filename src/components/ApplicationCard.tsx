import {useSelector} from "@xstate/react";
import {AnyState} from "xstate";
import {PortalApplicationRef} from "../machines/portalApplication";
import {NotificationsService} from "../machines/notificationsMachine";
import {isUpdateType, useAppLogger} from "../logger/useApplicationLogger";

const rolesSelector = (state: AnyState) => state?.context?.roles;
const assetsSelector = (state: AnyState) => state?.context?.assets;

export function ApplicationCard({app, notificationsService}: { app: PortalApplicationRef , notificationsService:NotificationsService}) {

    const {name, info, icon} = app;
    const assets = useSelector(app.machine, assetsSelector);
    useAppLogger(app.machine, notificationsService.send);

    return (
        <div
            className="column is-one-fifth-fullhd is-one-quarter-widescreen is-one-third-desktop is-one-third-tablet is-half-mobile">
            <div className="brand-card">
                <img src={`/img/${icon}`} alt=""/>
                <div className="meta">
                    <h3>{name}</h3>
                    <p>{info}</p>
                </div> 
                {assets && assets.map((role: { path: string, type: string }) =>
                    (<div className="product-actions" key={role.path}>
                            <span>{role.path}</span> 
                        </div>
                    )
                )
                }
            </div>
        </div>

    );
}