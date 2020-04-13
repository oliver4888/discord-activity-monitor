import { Role } from "discord.js"
import { DisharmonyGuild, DisharmonyGuildMember } from "@oliver4888/disharmony"

export default class Guild extends DisharmonyGuild {
    private _users: Map<string, Date>

    public get inactiveThresholdDays(): number { return this.record.inactiveThresholdDays || 7 }
    public set inactiveThresholdDays(value: number) { this.record.inactiveThresholdDays = value }

    public get activeRoleId(): string { return this.record.activeRoleId || "" }
    public set activeRoleId(value: string) { this.record.activeRoleId = value }

    public get activeRole() { return this.djs.roles.get(this.activeRoleId) }
    public get inactiveRole() { return this.djs.roles.get(this.inactiveRoleId) }

    public get inactiveRoleId(): string { return this.record.inactiveRoleId || "" }
    public set inactiveRoleId(value: string) { this.record.inactiveRoleId = value }

    public get allowRoleAddition(): boolean { return this.record.allowRoleAddition }
    public set allowRoleAddition(value: boolean) { this.record.allowRoleAddition = value }

    public get users(): Map<string, Date> {
        if (!this._users)
            this._users = new Map(this.record.users || [])
        return this._users
    }

    public ignoredUserIds: string[]
    public ignoredRoleIds: string[]

    public getConfigJson(): string {
        const blacklist = ["id", "_id", "users"]
        return JSON.stringify(
            this.toRecord(),
            (k, v) => blacklist.indexOf(k) < 0 ? v : undefined,
            "\t",
        )
    }

    public isMemberIgnored(member: DisharmonyGuildMember): boolean {
        const isIgnoredIndividually = this.ignoredUserIds.indexOf(member.id) >= 0
        const hasIgnoredRole = this.ignoredRoleIds.some(roleId => member.djs.roles.has(roleId))
        return isIgnoredIndividually || hasIgnoredRole
    }

    public canBotManageRole(targetRole: Role): boolean {
        return !!this.me.djs.roles.find(role =>
            role.position > targetRole.position // Bot has a role higher than the target role...
            && role.hasPermission("MANAGE_ROLES")) // ...which has the permission to manage other roles
    }

    /** True if the supplied snowflake is configured */
    public isRoleConfigured(snowflake: string) {
        return (
            snowflake
            && snowflake !== "disabled"
            && snowflake.length > 0
            && this.djs.roles.has(snowflake)
        )
    }

    /** True if the supplied snowflake is configured, but badly */
    public isRoleBadlyConfigured(snowflake: string) {
        return this.isRoleConfigured(snowflake) // Role is valid and exists
            && !this.canBotManageRole(this.djs.roles.get(snowflake)!) // Role hierarchy is configured to allow the bot to manage this role
    }

    /** True if the supplied snowflake is configured, and not configured badly */
    public isRoleWellConfigured(snowflake: string) {
        return this.isRoleConfigured(snowflake) // Role is valid and exists
            && !this.isRoleBadlyConfigured(snowflake) // Role is not badly configured
    }

    public loadRecord(record: any): void {
        this.ignoredUserIds = record.ignoredUserIds || []
        this.ignoredRoleIds = record.ignoredRoleIds || []
        return super.loadRecord(record)
    }

    public toRecord(): any {
        this.record.ignoredUserIds = this.ignoredUserIds
        this.record.ignoredRoleIds = this.ignoredRoleIds
        if (this._users)
            this.record.users = [...this._users.entries()]
        return super.toRecord()
    }
}