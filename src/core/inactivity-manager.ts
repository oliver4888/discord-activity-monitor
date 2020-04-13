import { LiteClient, LiteDisharmonyClient, loadConfig, Logger } from "@oliver4888/disharmony"
import Guild from "../models/guild"
import GuildMember from "../models/guild-member"

export default class InactivityManager {
    public async manageInactiveUsersInAllGuilds() {
        await Logger.debugLog("Beginning guild iteration to manage inactive users")
        for (const djsGuild of this.client.djs.guilds.values())
            await this.manageInactiveUsersInGuild(new Guild(djsGuild))
        await Logger.debugLog("Guilds iteration complete")
    }

    public async manageInactiveUsersInGuild(guild: Guild, now?: Date) {
        if (!guild.botHasPermissions(this.client.config.requiredPermissions))
            return

        await guild.loadDocument()

        if (!guild.isRoleWellConfigured(guild.activeRoleId))
            return

        Logger.debugLog(`Managing inactives for guild ${guild.id}`)
        for (const djsMember of guild.activeRole!.members.values()) {
            const member = new GuildMember(djsMember)

            if (!member || guild.isMemberIgnored(member)) // Don't ask me why, sometimes member is null
                continue

            // If the member has the active role but isn't in the database, add them
            now = now || new Date()
            if (!guild.users.get(member.id)) {
                guild.users.set(member.id, now)
                Logger.debugLog(`User ${member.id} has active role but not found in database, adding new entry`)
                Logger.logEvent("FoundManuallyActiveMember", { guildId: guild.id, memberId: member.id })
                continue
            }

            // If the member is inactive, remove the active role and remove them from the database
            const isMemberInactive = this.isInactiveBeyondThreshold(guild.users.get(member.id)!, now, guild.inactiveThresholdDays)
            if (isMemberInactive)
                await this.markMemberInactive(guild, member)
                    .catch(e => {
                        if (e.code !== 50013)
                            Logger.debugLogError(`Error switching user ${member.id} to inactive in guild ${guild.id}`, e)
                        Logger.logEvent("ErrorMarkingInactive", { guildId: guild.id, memberId: member.id, code: e.code })
                    })
        }

        await guild.save()
    }

    private async markMemberInactive(guild: Guild, member: GuildMember) {
        const reasonStr = `No activity detected within last ${guild.inactiveThresholdDays} days`
        await member.removeRole(guild.activeRole!.id, reasonStr)

        if (guild.isRoleWellConfigured(guild.inactiveRoleId))
            await member.addRole(guild.inactiveRoleId, reasonStr)

        guild.users.delete(member.id)
        Logger.logEvent("MarkedMemberInactive", { guildId: guild.id, memberId: member.id })
    }

    private isInactiveBeyondThreshold(lastActiveDate: Date, now: Date, thresholdDays: number): boolean {
        const dayLength = 24 * 60 * 60 * 1000
        return Math.round(Math.abs(now.getTime() - lastActiveDate.getTime()) / dayLength) > thresholdDays
    }

    constructor(
        private client: LiteClient,
    ) { }
}

if (!module.parent) {
    const configPath = process.argv[2]
    const config = loadConfig(undefined, configPath)
    const client = new LiteDisharmonyClient(config)
    const inactivityManager = new InactivityManager(client)
    client.login(config.token)
        .then(async () => {
            await inactivityManager.manageInactiveUsersInAllGuilds()
            await client.destroy()
            await Logger.debugLog("Finished managing inactives, exiting worker")
            process.exit(0)
        })
        .catch(async err => {
            await Logger.debugLogError("Error running the inactivity monitor", err)
            await Logger.logEvent("ErrorStartingInactivityMonitor")
            process.exit(1)
        })
}