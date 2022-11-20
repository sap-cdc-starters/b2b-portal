import {
    getAccount,
    getJwt,
    logout,
    performSignin,
    performSignup, 
    socialLoginAsync,
    SocialLoginParams
} from "../gigya/gigyaAuthMachine";
import {omit} from "lodash/fp";
import {AuthMachine} from "./authMachine";

function toMfa(tokenDetails: any) {
    return {
    ...{...tokenDetails.sub_id?.sub_id || {}},
    ...omit('sub_id', tokenDetails || {})    
    } 
}

export const withGigya= (authMachine:AuthMachine)=>authMachine.withConfig({
    services: {
        performSignup: async (ctx, event) => {
            const payload = omit("type", event);
            return await performSignup(payload)
        },
        performLogin: async (ctx, event) => {
            const payload = omit("type", event);
            const loginMode =ctx.user? "reAuth" : "standard"
            return await performSignin({...payload, loginMode})
        },
        getToken: async (ctx, event) => {
            const payload = omit("type", event);
            const idToken = await getJwt(payload);
            const tokenDetails= decodeJwt(idToken as string);

            const mfaToken = decodeJwt(idToken as string);
            const forMfa = toMfa(mfaToken);
            delete  mfaToken.sub_id;
            delete  mfaToken.amr;
            delete  mfaToken.email;
            mfaToken.sub_ids = [forMfa];
            
            return { idToken: {raw: idToken, details:tokenDetails}, mfaToken, access_token:btoa(JSON.stringify(mfaToken))   };
        },

        enrichToken: async (ctx, event) => {
            const payload = omit("type", event);
            const idToken = await getJwt(payload);
            const tokenDetails= decodeJwt(idToken as string); 
            const mfaToken = ctx.mfaToken;
            const forMfa = toMfa( decodeJwt(idToken as string));
            mfaToken.sub_ids = [...mfaToken.sub_ids, forMfa];
             return { idToken:  {raw: idToken, details:tokenDetails}, mfaToken, access_token:btoa(JSON.stringify(mfaToken)) };

            function decodeJwt(token?:string) {

                return token && token.split && JSON.parse(atob(token.split('.')[1]));

            }  
         

            
        },
        performSocialLogin: async (ctx, event) => {
            if (event.type === "SOCIAL") {
                const payload = omit("type", event);
                const loginMode =ctx.user? "reAuth" :  "standard"

                return await  socialLoginAsync({...payload, loginMode} as SocialLoginParams);
            }

        },
        getUserProfile: async (ctx, event) => {
            const payload = omit("type", event);
            const user = await getAccount(payload);
            return {user:{ ...(user?.userInfo || {}),  photo: user?.profile?.photoURL}};
        },
        performLogout: async (ctx, event) => {
            localStorage.removeItem("authState");
            return await logout();
        },
        /*'login-service':loginMachine.withConfig({
            services:{
                performSignup: async (ctx, event) => {
                    const payload = omit("type", event);
                    return await performSignup(payload)
                },
                performLogin: async (ctx, event) => {
                    const payload = omit("type", event);
                    const loginMode =ctx.user? "reAuth" : "standard"
                    return await performSignin({...payload, loginMode})
                },
                performSocialLogin: async (ctx, event) => {
                    if (event.type == "SOCIAL") {
                        const payload = omit("type", event);
                        const loginMode =ctx.user? "reAuth" :  "standard"

                        return await  socialLoginAsync({...payload, loginMode} as SocialLoginParams);
                    }

                },
            }
        })*/
    },
    actions: {
        // assignLoginService:assign({
        //     loginService:(context) => spawn(loginMachine.withConfig({
        //         services:{
        //             performSignup: async (ctx, event) => {
        //                 const payload = omit("type", event);
        //                 return await performSignup(payload)
        //             },
        //             performLogin: async (ctx, event) => {
        //                 const payload = omit("type", event);
        //                 const loginMode =ctx.user? "reAuth" : "standard"
        //                 return await performSignin({...payload, loginMode})
        //             },
        //             performSocialLogin: async (ctx, event) => {
        //                 if (event.type == "SOCIAL") {
        //                     const payload = omit("type", event);
        //                     const loginMode =ctx.user? "reAuth" :  "standard"
        //
        //                     return await  socialLoginAsync({...payload, loginMode} as SocialLoginParams);
        //                 }
        //
        //             },
        //         }
        //     }))
        // })
        // onUnauthorizedEntry: async (ctx, event) => {
        //     if (history.location.pathname !== "/signin") {
        //         /* istanbul ignore next */
        //         history.push("/signin");
        //     }
        // },
        // onAuthorizedEntry: async (ctx, event) => {
        //     if (history.location.pathname === "/signin") {
        //         /* istanbul ignore next */
        //         history.push("/");
        //     } else {
        //         history.push(
        //             `/profile`
        //         );
        //     }
        //
        // },
    }
});

function decodeJwt(token?:string) {

    return token && token.split && JSON.parse(atob(token.split('.')[1]));

}  