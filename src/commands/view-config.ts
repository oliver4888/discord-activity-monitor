import { RichEmbed } from "discord.js"
import { Command, PermissionLevel } from "disharmony"
import Message from "../models/message"

async function invoke(_: string[], message: Message)
{
    if (!message.guild.isRoleConfigured(message.guild.activeRoleId))
        return "Server not yet configured"

    const embed = new RichEmbed().setTitle("__Server Configuration__")

    embed.addField("**Activity**", "*What happens when Activity Monitor detects activity*")
    embed.addField("Active role", (message.guild.activeRole || "*ERROR*").toString(), true)
    embed.addField("Auto-assign active", message.guild.allowRoleAddition ? "On" : "Off", true)

    embed.addBlankField()
    embed.addField("**Inactivity**", "*What happens when Activity Monitor doesn't detect activity for a user for a period of time*")
    embed.addField("Threshold", `${message.guild.inactiveThresholdDays} days`, true)
    embed.addField("Inactive role", message.guild.inactiveRole ? message.guild.inactiveRole.name : "*Disabled*", true)

    embed.addBlankField()
    embed.addField("**Ignored users/roles**", "*Which users and roles Activity Monitor should ignore entirely*")
    const ignoredUsers = message.guild.ignoredUserIds.map(x => message.guild.djs.members.get(x))
    embed.addField("ignoredUsers", ignoredUsers.length, true)
    const ignoredRoles = message.guild.ignoredRoleIds.map(x => message.guild.djs.roles.get(x))
    embed.addField("ignoredRoles", ignoredRoles.length, true)

    await message.reply(embed)
}

export default new Command(
    /*syntax*/          "view-config",
    /*description*/     "View configuration for this server",
    /*permissionLevel*/ PermissionLevel.Admin,
    /*invoke*/          invoke,
)