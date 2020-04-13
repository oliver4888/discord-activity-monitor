import { DisharmonyClient, Logger } from "@oliver4888/disharmony"
import ActivityMonitorConfig from "../models/activity-monitor-config"
import Guild from "../models/guild"
import GuildMember from "../models/guild-member"
import Message from "../models/message"

export default class ActivityRegisterer {
    public startListening() {
        this.client.onMessage.sub(
            message => this.registerActivity(message.guild, message.member, message.textChannelName))
        this.client.onVoiceStateUpdate.sub(
            args => this.registerActivity(
                new Guild(args.newMember.djs.guild),
                args.newMember,
                args.newMember.voiceChannelName || args.oldMember.voiceChannelName))
    }

    public async registerActivity(guild: Guild, member: GuildMember, channelName: string, date?: Date) {
        // Exit if...
        if (!member || !guild                                                   // ...either of the parameters are null
            || member.id === this.client.botId                                  // ...the message is from self
            || !guild.botHasPermissions(this.client.config.requiredPermissions))   // ...the bot does not have the required permissions in this guild
            return

        // Load the document in order to be able to process following checks
        await guild.loadDocument()

        // Exit if...
        if (!guild.allowRoleAddition                // ...the guild does not allow role additon
            || guild.isMemberIgnored(member)        // ...the member is ignored in this guild
            || !guild.isRoleConfigured(guild.activeRoleId)       // ...the active role is not configured in this guild
            || guild.isRoleBadlyConfigured(guild.activeRoleId)) // ...the active role is badly configured in this guild
            return

        // Update the user's role and database entry
        guild.users.set(member.id, date || new Date())
        await this.markMemberActive(guild, member, channelName)
        await guild.save()
    }

    private async markMemberActive(guild: Guild, member: GuildMember, channelName: string) {
        try {
            const reasonStr = `Activity detected in channel '${channelName}'`

            if (member.djs.roles.has(guild.activeRoleId))
                return

            await member.addRole(guild.activeRoleId, reasonStr)

            const hasInactiveRole = guild.inactiveRoleId && guild.inactiveRoleId !== "disabled"
            let didRemoveInactiveRole = false
            if (hasInactiveRole) {
                await member.removeRole(guild.inactiveRoleId, reasonStr)
                didRemoveInactiveRole = true
            }

            Logger.logEvent("MarkedMemberActive", { guildId: guild.id, memberId: member.id, removedInactiveRole: didRemoveInactiveRole })
        }
        catch (e) {
            if (e.code !== 50013)
                Logger.debugLogError(`Error marking user ${member.id} active in guild ${guild.id}.`, e)
            Logger.logEvent("ErrorMarkingMemberActive", { guildId: guild.id, memberId: member.id, code: e.code })
        }
    }

    constructor(
        private client: DisharmonyClient<Message, Guild, GuildMember, ActivityMonitorConfig>,
    ) { }
}
