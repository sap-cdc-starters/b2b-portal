import React, {useEffect, useState, createContext, useContext} from "react";
import {authMachine, AuthService, AuthMachineContext, AuthMachine} from "../machines/authMachine";
import {withGigya} from "../machines/gigyaAuthMachine";
import {useInterpret} from "@xstate/react";

export const AuthContext = createContext<AuthService>({} as AuthService);

export function AuthProvider({ children}:React.PropsWithChildren) {

    const getMachine=():AuthMachine => withGigya(authMachine);
    const authService= useInterpret(getMachine);
 
        return  <AuthContext.Provider value={authService}>
            {children}
        </AuthContext.Provider> 
}
