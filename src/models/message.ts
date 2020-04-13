import { Message as DjsMessage, TextChannel } from "discord.js"
import { DisharmonyMessage } from "@oliver4888/disharmony"
import Guild from "./guild"
import GuildMember from "./guild-member"

export default class Message extends DisharmonyMessage {
    public readonly guild: Guild
    public readonly member: GuildMember

    public get textChannelName() { return (this.djs.channel as TextChannel).name }

    constructor(djsMessage: DjsMessage) {
        super(djsMessage)
        this.guild = new Guild(djsMessage.guild)
    }
}