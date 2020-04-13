import { Client, Command, CommandRejection, Logger, PermissionLevel } from "@oliver4888/disharmony"
import SetupHelper from "../core/setup-helper"
import Message from "../models/message"

async function invoke(_: string[], message: Message, client: Client) {
    const setupHelper = new SetupHelper()

    try {
        Logger.logEvent("SetupInitiated", { guildId: message.guild.id })

        await setupHelper.walkThroughSetup(client, message)
        await message.guild.save()

        await message.reply("Setup complete!")

        // TODO Clean up these messages; haven't done it yet as I plan to update setup soon anyway
        if (message.guild.allowRoleAddition && message.guild.isRoleBadlyConfigured(message.guild.activeRoleId))
            await message.reply(`Please give <@${client.botId}> a role above ${message.guild.activeRole!.toString()} in the Discord role hierarchy, else role updating cannot function.`)

        if (message.guild.isRoleBadlyConfigured(message.guild.inactiveRoleId))
            await message.reply(`Please give <@${client.botId}> a role above ${message.guild.inactiveRole!.toString()} in the Discord role hierarchy, else role updating cannot function.`)

        Logger.logEvent("SetupCompleted", { guildId: message.guild.id })
    }
    catch (e) {
        Logger.logEvent("SetupRejected", { guildId: message.guild.id })
        throw new CommandRejection(`Error during setup for guild ${message.guild.id}.\n`)
    }
}

export default new Command(
    /*syntax*/          "setup",
    /*description*/     "Setup activity monitor for this server",
    /*permissionLevel*/ PermissionLevel.Admin,
    /*invoke*/          invoke,
)