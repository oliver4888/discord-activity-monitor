import { Command, PermissionLevel } from "@oliver4888/disharmony"
import Message from "../models/message"

async function invoke(_: string[], message: Message) {
    return `\`\`\`JavaScript\n ${message.guild.getConfigJson()}\`\`\``
}

export default new Command(
    /*syntax*/          "view-config",
    /*description*/     "View configuration for this server",
    /*permissionLevel*/ PermissionLevel.Admin,
    /*invoke*/          invoke,
)