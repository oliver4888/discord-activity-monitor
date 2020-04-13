import { AsyncTest, Expect, Setup, TestFixture } from "alsatian"
import { Role } from "discord.js"
import { DisharmonyClient } from "@oliver4888/disharmony"
import { IMock, It, Mock, Times } from "typemoq"
import Guild from "../models/guild"
import GuildMember from "../models/guild-member"
import Message from "../models/message"
import InactivityManager from "./inactivity-manager"

@TestFixture("Inactivity manager")
export class InactivityManagerTestFixture {
    private guildUsers: Map<string, Date>
    private activeRoleId = "active-role"
    private inactiveRoleId = "inactive-role"
    private activeRoleMembers: Map<string, GuildMember>
    private memberId: string = "member-id"

    private client: IMock<DisharmonyClient<Message, Guild, GuildMember>>
    private guild: IMock<Guild>
    private member: IMock<GuildMember>
    private activeRole: IMock<Role>

    @Setup
    public setup() {
        this.guildUsers = new Map<string, Date>()

        this.client = Mock.ofType<DisharmonyClient<Message, Guild, GuildMember>>()

        this.member = Mock.ofType<GuildMember>()
        this.member.setup(x => x.id).returns(() => this.memberId)

        this.activeRoleMembers = new Map<string, GuildMember>([[this.memberId, this.member.object]])

        this.activeRole = Mock.ofType<Role>()
        this.activeRole.setup(x => x.id).returns(() => this.activeRoleId)
        this.activeRole.setup(x => x.members).returns(() => this.activeRoleMembers as any)

        this.guild = Mock.ofType<Guild>()
        this.guild.setup(x => x.botHasPermissions(It.isAny())).returns(() => true)
        this.guild.setup(x => x.isRoleWellConfigured(this.activeRoleId)).returns(() => true)
        this.guild.setup(x => x.isMemberIgnored(It.isAny())).returns(() => false)
        this.guild.setup(x => x.users).returns(() => this.guildUsers)
        this.guild.setup(x => x.activeRoleId).returns(() => this.activeRoleId)
        this.guild.setup(x => x.inactiveRoleId).returns(() => this.inactiveRoleId)
        this.guild.setup(x => x.activeRole).returns(() => this.activeRole.object)
        this.guild.setup(x => x.inactiveThresholdDays).returns(() => 1)
    }

    @AsyncTest()
    public async untracked_member_with_active_role_added_to_users() {
        // ARRANGE
        const now = new Date()

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        Expect(this.guild.object.users.size).toBe(1)
        Expect(this.guild.object.users.get(this.memberId)).toBe(now)
    }

    @AsyncTest()
    public async untracked_member_with_active_role_not_added_to_users_if_ignored() {
        // ARRANGE
        void (this.guild.object.isMemberIgnored({} as any))
        this.guild.setup(x => x.isMemberIgnored(It.isAny())).returns(() => true)

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object)

        // ASSERT
        Expect(this.guild.object.users.size).toBe(0)
    }

    @AsyncTest()
    public async untracked_member_with_active_role_not_added_to_users_if_bot_missing_required_perms() {
        // ARRANGE
        void (this.guild.object.botHasPermissions(0))
        this.guild.setup(x => x.botHasPermissions(It.isAny())).returns(() => false)

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object)

        // ASSERT
        Expect(this.guild.object.users.size).toBe(0)
    }

    @AsyncTest()
    public async active_role_removed_if_all_bot_perms_valid() {
        // ARRANGE
        const now = new Date(2000, 1, 10)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 1))

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        this.member.verify(x =>
            x.removeRole(this.activeRoleId, It.isAnyString()),
            Times.once())
    }

    @AsyncTest()
    public async active_role_not_removed_if_bot_missing_required_perms() {
        // ARRANGE
        void (this.guild.object.botHasPermissions(0))
        this.guild.setup(x => x.botHasPermissions(It.isAny())).returns(() => false)

        const now = new Date(2000, 1, 10)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 1))

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        this.member.verify(x =>
            x.removeRole(It.isAny(), It.isAny()),
            Times.never())
    }

    @AsyncTest()
    public async roles_not_managed_if_active_role_not_well_configured() {
        // ARRANGE
        const now = new Date(2000, 1, 10)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 1))

        void (this.guild.object.isRoleWellConfigured(this.activeRoleId))
        this.guild.setup(x => x.isRoleWellConfigured(this.activeRoleId)).returns(() => false)

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        this.member.verify(x =>
            x.addRole(It.isAny(), It.isAny()),
            Times.never())

        this.member.verify(x =>
            x.removeRole(It.isAny(), It.isAny()),
            Times.never())
    }

    @AsyncTest()
    public async member_considered_inactive_when_last_active_half_a_day_beyond_threshold() {
        // ARRANGE
        const now = new Date(2000, 1, 10, 0, 0, 0)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 8, 12, 0, 0))

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        this.member.verify(x =>
            x.removeRole(this.activeRoleId, It.isAnyString()),
            Times.once())
    }

    @AsyncTest()
    public async member_not_considered_inactive_if_last_active_under_half_a_day_beyond_threshold() {
        // ARRANGE
        const now = new Date(2000, 1, 10, 0, 0, 0)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 8, 12, 0, 1))

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        this.member.verify(x =>
            x.removeRole(this.activeRoleId, It.isAnyString()),
            Times.never())
    }

    @AsyncTest()
    public async inactive_role_added_when_active_role_removed_if_inactive_role_well_configured() {
        // ARRANGE
        const now = new Date(2000, 1, 10)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 1))

        const inactiveRole = Mock.ofType<Role>()
        inactiveRole.setup(x => x.id).returns(() => this.inactiveRoleId)
        this.guild.setup(x => x.inactiveRole).returns(() => inactiveRole.object)
        this.guild.setup(x => x.isRoleWellConfigured(this.inactiveRoleId)).returns(() => true)

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        this.member.verify(x =>
            x.removeRole(this.activeRoleId, It.isAnyString()),
            Times.once())

        this.member.verify(x =>
            x.addRole(this.inactiveRoleId, It.isAnyString()),
            Times.once())
    }

    @AsyncTest()
    public async inactive_role_not_added_if_not_well_configured() {
        // ARRANGE
        const now = new Date(2000, 1, 10)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 1))

        const inactiveRole = Mock.ofType<Role>()
        inactiveRole.setup(x => x.id).returns(() => this.inactiveRoleId)
        this.guild.setup(x => x.inactiveRole).returns(() => inactiveRole.object)
        this.guild.setup(x => x.isRoleWellConfigured(this.inactiveRoleId)).returns(() => false)

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        this.member.verify(x =>
            x.addRole(this.inactiveRoleId, It.isAnyString()),
            Times.never())
    }

    @AsyncTest()
    public async inactive_role_not_added_if_bot_missing_required_perms() {
        // ARRANGE
        void (this.guild.object.botHasPermissions(0))
        this.guild.setup(x => x.botHasPermissions(It.isAny())).returns(() => false)

        const now = new Date(2000, 1, 10)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 1))

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        this.member.verify(x =>
            x.addRole(It.isAny(), It.isAny()),
            Times.never())
    }

    @AsyncTest()
    public async inactive_member_removed_from_users() {
        // ARRANGE
        const now = new Date(2000, 1, 10)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 1))

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        Expect(this.guildUsers.size).toBe(0)
    }

    @AsyncTest()
    public async inactive_member_not_removed_from_users_if_bot_missing_required_perms() {
        // ARRANGE
        void (this.guild.object.botHasPermissions(0))
        this.guild.setup(x => x.botHasPermissions(It.isAny())).returns(() => false)

        const now = new Date(2000, 1, 10)
        this.guildUsers.set(this.memberId, new Date(2000, 1, 1))

        // ACT
        const sut = new InactivityManager(this.client.object)
        await sut.manageInactiveUsersInGuild(this.guild.object, now)

        // ASSERT
        Expect(this.guildUsers.size).toBe(1)
    }
}