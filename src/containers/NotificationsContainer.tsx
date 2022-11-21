import React, {useEffect} from "react";
import {AnyEventObject, Interpreter, ActionTypes} from "xstate";
import {Button, Paper, Typography ,Icon, FormControlLabel, Slide,Switch, Box} from "@mui/material";
import { Close } from "@mui/icons-material";
import makeStyles from '@mui/styles/makeStyles';
import NotificationList from "../components/NotificationList";
import {AuthService} from "../machines/authMachine";
import {NotificationResponseItem, NotificationsEvents, NotificationsService} from "../machines/notificationsMachine";
import {omit} from "lodash/fp";
import {useActor,useSelector} from "@xstate/react";

const useStyles = makeStyles((theme) => ({
    paper: {
        minHeight: "90vh",
        padding: theme.spacing(2),
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
    },
}));

export interface Props {
    authService: AuthService;
    notificationsService: NotificationsService;
}

function generateUniqueID() {
        // Math.random should be unique because of its seeding algorithm.
        // Convert it to base 36 (numbers + letters), and grab the first 9 characters
        // after the decimal.
        return '_' + Math.random().toString(36).substr(2, 9);
    }


interface NotificationUpdatePayload {
}
const loginServiceSelector = (state: any) => state;

const NotificationsContainer: React.FC<Props> = ({authService, notificationsService}) => {
    const classes = useStyles();
    // const [authState] = useActor(authService);
    const [notificationsState, sendNotifications] = useActor(notificationsService);

    function getPayload(event: AnyEventObject) {
       return {
        ...omit( ['type','data', 'service', 'loader'], event),
        ...(event.data || {})

        };
    }



    function doneDetails(event: AnyEventObject):Partial<NotificationResponseItem >{
        if(event.type.indexOf('DONE.') > 0 || event.type.indexOf('.SUCCESS') > 0){
            const title=  `done: ${event.type.replace('DONE.INVOKE.' , '').replace(':INVOCATION[0]' , '')}`
            return {
                severity: 'success',
                title

            }
        }
        return {};
    }
    function errorDetails(event: AnyEventObject):Partial<NotificationResponseItem >{
        if(event.type.indexOf('ERROR.') > 0  || event.type.indexOf('.ERROR') > 0){
            const title= `${event.type.toLowerCase()
                .replace(ActionTypes.ErrorCommunication , 'communication error: ')
                .replace(ActionTypes.ErrorExecution, 'execution error: ')
                .replace(ActionTypes.ErrorCustom,  'error: ')
                
                .replace(':invocation[0]' , '')} `;
            return { 
                severity: 'error',
                title
                
            }
        }
        return {};
    }
    useEffect(() => {
        authService.subscribe(state => {
            if(!state) return; 
            console.log(state);
            sendNotifications({
                type: "ADD", notification: {
                    id: generateUniqueID(),
                    title:   state.event?.type?.toLowerCase()  ,
                    severity: 'info',
                    payload: getPayload(state.event || state.context),
                    ...doneDetails(state.event|| state.context),
                    ...errorDetails(state.event|| state.context)
                }
            })
        })
    }, [authService])

    // useEffect(() => {
    //   sendNotifications({
    //     type: "ADD", notification: {
    //       id: "Auth State",
    //       title: authState.value as string,
    //       severity:  "info",
    //       payload: authState
    //     }
    //   })
    // }, [authState]);

    const handleChange = () => {
        if(notificationsState.matches("visible")){
            sendNotifications("HIDE");
        }else {
            sendNotifications("SHOW");
        }
    };

    const updateNotification = (payload: NotificationUpdatePayload) => {
    };
    const checked= notificationsState.matches("visible");

    return (
        <Box >
            <FormControlLabel
                control={<Switch checked={notificationsState.matches("visible")} onChange={handleChange} />}
                label="Show logger"
            />
            <Slide direction="up" in={checked} >
                <Paper className={classes.paper} > 
                    <Typography component="h2" variant="h6" color="primary" gutterBottom>
                        Logger
                    </Typography>

                    <NotificationList
                        notifications={notificationsState?.context?.notifications!}
                        updateNotification={updateNotification}
                    />
                </Paper>
            </Slide>
        </Box>
 
    );
};

export default NotificationsContainer;
