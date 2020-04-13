// tslint:disable: no-unused-expression
import { AsyncTest, Expect, Setup, TestFixture } from "alsatian"
import { DisharmonyClient } from "@oliver4888/disharmony"
import { IMock, It, Mock, Times } from "typemoq"
import ActivityMonitorConfig from "../models/activity-monitor-config"
import Guild from "../models/guild"
import GuildMember from "../models/guild-member"
import Message from "../models/message"
import ActivityRegisterer from "./activity-registerer"

@TestFixture("Activity registerer")
export class ActivityRegistererTestFixture {
    private client: DisharmonyClient<Message, Guild, GuildMember, ActivityMonitorConfig>
    private guild: IMock<Guild>
    private member: IMock<GuildMember>

    private readonly channelName: string = "test-channel"
    private readonly activeRoleId: string = "active-role-id"
    private guildUsers: Map<string, Date>

    @Setup
    public setup() {
        const client = {} as any
        client.config = {} as any
        client.config.requiredPermissions = 1
        client.botId = "bot-id"
        this.client = client

        this.guild = Mock.ofType<Guild>()
        this.guild.setup(x => x.botHasPermissions(It.isAnyNumber())).returns(() => true)
        this.guild.setup(x => x.allowRoleAddition).returns(() => true)
        this.guild.setup(x => x.isMemberIgnored(It.isAny())).returns(() => false)
        this.guild.setup(x => x.isRoleConfigured(this.activeRoleId)).returns(() => true)
        this.guild.setup(x => x.isRoleBadlyConfigured(this.activeRoleId)).returns(() => false)
        this.guild.setup(x => x.activeRoleId).returns(() => this.activeRoleId)

        this.guildUsers = new Map<string, Date>()
        this.guild.setup(x => x.users).returns(() => this.guildUsers)

        this.member = Mock.ofType<GuildMember>()
        this.member.setup(x => x.id).returns(() => "member-id")
    }

    @AsyncTest()
    public async register_activity_updates_member_when_all_bot_perms_valid() {
        // ARRANGE
        const now = new Date()
        this.member.setup(x => x.djs).returns(() => ({ roles: new Map() }) as any)

        // ACT
        const sut = new ActivityRegisterer(this.client)
        await sut.registerActivity(this.guild.object, this.member.object, this.channelName, now)

        // ASSERT
        Expect(this.guildUsers.size).toBe(1)
        Expect(this.guildUsers.get("member-id")).toBe(now)

        this.member.verify(x =>
            x.addRole(this.activeRoleId, It.isAnyString()),
            Times.once())
    }

    @AsyncTest()
    public async register_activity_does_not_update_member_if_member_id_is_bot_id() {
        // ARRANGE
        void (this.member.object.id)
        this.member.setup(x => x.id).returns(() => "bot-id")

        // ACT
        const sut = new ActivityRegisterer(this.client)
        await sut.registerActivity(this.guild.object, this.member.object, this.channelName)

        // ASSERT
        this.member.verify(x => x.addRole(It.isAny()), Times.never())
        this.member.verify(x => x.addRole(It.isAny(), It.isAny()), Times.never())
    }

    @AsyncTest()
    public async register_activity_does_not_update_member_if_bot_missing_required_perms() {
        // ARRANGE
        void (this.guild.object.botHasPermissions(0))
        this.guild.setup(x => x.botHasPermissions(It.isAnyNumber())).returns(() => false)

        // ACT
        const sut = new ActivityRegisterer(this.client)
        await sut.registerActivity(this.guild.object, this.member.object, this.channelName)

        // ASSERT
        this.member.verify(x => x.addRole(It.isAny()), Times.never())
        this.member.verify(x => x.addRole(It.isAny(), It.isAny()), Times.never())
    }

    @AsyncTest()
    public async register_activity_does_not_update_member_if_guild_does_not_allow_role_addition() {
        // ARRANGE
        void (this.guild.object.allowRoleAddition)
        this.guild.setup(x => x.allowRoleAddition).returns(() => false)

        // ACT
        const sut = new ActivityRegisterer(this.client)
        await sut.registerActivity(this.guild.object, this.member.object, this.channelName)

        // ASSERT
        this.member.verify(x => x.addRole(It.isAny()), Times.never())
        this.member.verify(x => x.addRole(It.isAny(), It.isAny()), Times.never())
    }

    @AsyncTest()
    public async register_activity_does_not_update_member_if_member_is_ignored() {
        // ARRANGE
        void (this.guild.object.isMemberIgnored(It.isAny()))
        this.guild.setup(x => x.isMemberIgnored(It.isAny())).returns(() => true)

        // ACT
        const sut = new ActivityRegisterer(this.client)
        await sut.registerActivity(this.guild.object, this.member.object, this.channelName)

        // ASSERT
        this.member.verify(x => x.addRole(It.isAny()), Times.never())
        this.member.verify(x => x.addRole(It.isAny(), It.isAny()), Times.never())
    }

    @AsyncTest()
    public async register_activity_does_not_update_member_if_active_role_not_configured() {
        // ARRANGE
        void (this.guild.object.isRoleConfigured(this.activeRoleId))
        this.guild.setup(x => x.isRoleConfigured(this.activeRoleId)).returns(() => false)

        // ACT
        const sut = new ActivityRegisterer(this.client)
        await sut.registerActivity(this.guild.object, this.member.object, this.channelName)

        // ASSERT
        this.member.verify(x => x.addRole(It.isAny()), Times.never())
        this.member.verify(x => x.addRole(It.isAny(), It.isAny()), Times.never())
    }

    @AsyncTest()
    public async register_activity_does_not_update_member_if_active_role_badly_configured() {
        // ARRANGE
        void (this.guild.object.isRoleBadlyConfigured(this.activeRoleId))
        this.guild.setup(x => x.isRoleBadlyConfigured(this.activeRoleId)).returns(() => true)

        // ACT
        const sut = new ActivityRegisterer(this.client)
        await sut.registerActivity(this.guild.object, this.member.object, this.channelName)

        // ASSERT
        this.member.verify(x => x.addRole(It.isAny()), Times.never())
        this.member.verify(x => x.addRole(It.isAny(), It.isAny()), Times.never())
    }
}