import { DisharmonyGuildMember } from "@oliver4888/disharmony"

export default class GuildMember extends DisharmonyGuildMember {
    public get voiceChannelName(): string { return this.djs.voiceChannel && this.djs.voiceChannel.name || "" }
}