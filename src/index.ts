import * as Joi from "@hapi/joi"
import * as Cluster from "cluster"
import { DisharmonyClient, forkWorkerClient, loadConfig, Logger } from "@oliver4888/disharmony"
import { resolve } from "path"
import commands from "./commands"
import ActivityRegisterer from "./core/activity-registerer"
import ActivityMonitorConfig from "./models/activity-monitor-config"
import GuildMember from "./models/guild-member"
import Message from "./models/message"

const configSchema = Joi.object().keys({ cullingIntervalSec: Joi.number().required() })
const config = loadConfig<ActivityMonitorConfig>(configSchema)

if (Cluster.isMaster) {
    const client = new DisharmonyClient(commands, config, Message, GuildMember)
    client.login(config.token)
        .then(() => {
            new ActivityRegisterer(client).startListening()
            setInterval(runInactivityManager, config.cullingIntervalSec * 1000, client, !config.computedValues!.isLocalDb)
            runInactivityManager(client, !config.computedValues!.isLocalDb)
                .catch(err => Logger.debugLogError("Error running inactivity monitor for the first time. It is likely that subsequent executions will also error.", err))
        })
        .catch(async err => {
            await Logger.consoleLogError("Error during initialisation", err)
            process.exit(1)
        })
}

async function runInactivityManager(client: DisharmonyClient<Message>, useForkedProcess: boolean) {
    const path = "./core/inactivity-manager"
    if (useForkedProcess)
        forkWorkerClient(resolve(__dirname, path), config.computedValues!.configPath)
    else {
        // tslint:disable-next-line: variable-name
        const InactivityManager = (await import(path)).default
        await new InactivityManager(client).manageInactiveUsersInAllGuilds()
        await Logger.debugLog("Finished managing inactives")
    }
}
